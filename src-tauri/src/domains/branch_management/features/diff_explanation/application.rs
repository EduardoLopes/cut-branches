//! Use-cases for diff explanations: turn a diff target + file into the prompt
//! text an agent sees, and drive an `Explainer` port to produce the streamed
//! explanation. The git work is reused wholesale from the sibling `branch_diff`
//! slice (same parent domain) so the agent is fed a deterministic unified diff
//! rather than being asked to read files itself.

use std::fmt::Write as _;
use std::path::Path;

use super::agent::Explainer;
use super::models::ExplanationStyle;
use crate::domains::branch_management::features::branch_diff::git::{self, DiffTarget};
use crate::domains::branch_management::features::branch_diff::models::{
    DiffLineKind, FileChangeStatus, FileDiff,
};
use crate::shared::error::AppError;

/// Every changed file's path for the target — the default batch set when the
/// caller doesn't name specific files.
pub fn list_target_file_paths(
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<Vec<String>, AppError> {
    Ok(git::list_changed_files(path, target)?
        .into_iter()
        .map(|file| file.path)
        .collect())
}

/// Builds the unified-diff text for one file that gets embedded in the prompt.
pub fn build_file_diff_text(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    old_path: Option<&str>,
) -> Result<String, AppError> {
    let diff = git::get_file_diff(path, target, file_path, old_path)?;
    Ok(render_diff(&diff))
}

/// Renders a [`FileDiff`] back into `git`-style unified-diff text — the format
/// agents are trained to read. Binary/rename-only files yield just a header.
fn render_diff(diff: &FileDiff) -> String {
    let mut out = String::new();
    let header_path = diff.old_path.as_deref().unwrap_or(&diff.path);
    let _ = writeln!(out, "diff --git a/{header_path} b/{}", diff.path);
    let _ = writeln!(out, "status: {}", status_label(diff.status));

    if diff.is_binary {
        let _ = writeln!(out, "Binary files differ");
        return out;
    }

    for hunk in &diff.hunks {
        let _ = writeln!(out, "{}", hunk.header);
        for line in &hunk.lines {
            let prefix = match line.kind {
                DiffLineKind::Added => '+',
                DiffLineKind::Removed => '-',
                DiffLineKind::Context => ' ',
            };
            let _ = writeln!(out, "{prefix}{}", line.content);
        }
    }

    if diff.truncated {
        let _ = writeln!(out, "… diff truncated (too large)");
    }
    out
}

/// The marker prefixing each hunk in a numbered diff, echoed by the agent to
/// delimit its per-hunk explanations. Deliberately distinct from git's
/// `@@ -a,b +c,d @@` so a parser never confuses the two.
pub const HUNK_MARKER_PREFIX: &str = "@@HUNK";

/// Builds the prompt + ordered hunk headers for a per-change-group explanation.
/// Returns `(prompt, headers)`; `headers` is empty for files with no textual
/// hunks (binary, pure rename), in which case the caller can skip the agent.
pub fn build_hunk_explanation_request(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    old_path: Option<&str>,
    style: ExplanationStyle,
) -> Result<(String, Vec<String>), AppError> {
    let diff = git::get_file_diff(path, target, file_path, old_path)?;
    let (numbered, headers) = render_numbered_diff(&diff);
    if headers.is_empty() {
        return Ok((String::new(), headers));
    }
    Ok((build_hunk_prompt(style, file_path, &numbered), headers))
}

/// Renders the diff with each hunk prefixed by a `@@HUNK <n>@@` marker line,
/// returning that text and the ordered list of the hunks' git headers.
fn render_numbered_diff(diff: &FileDiff) -> (String, Vec<String>) {
    let mut out = String::new();
    let mut headers = Vec::with_capacity(diff.hunks.len());
    for (index, hunk) in diff.hunks.iter().enumerate() {
        let _ = writeln!(out, "{HUNK_MARKER_PREFIX} {}@@", index + 1);
        let _ = writeln!(out, "{}", hunk.header);
        for line in &hunk.lines {
            let prefix = match line.kind {
                DiffLineKind::Added => '+',
                DiffLineKind::Removed => '-',
                DiffLineKind::Context => ' ',
            };
            let _ = writeln!(out, "{prefix}{}", line.content);
        }
        headers.push(hunk.header.clone());
    }
    (out, headers)
}

/// The per-hunk prompt: instruct the agent to echo each `@@HUNK n@@` marker and
/// explain that hunk at the style's verbosity, in order, and nothing else — so
/// the stream can be split back into per-hunk sections as it arrives.
fn build_hunk_prompt(style: ExplanationStyle, file_path: &str, numbered_diff: &str) -> String {
    format!(
        "You are reviewing a code change hunk by hunk. In the unified diff of `{file_path}` \
below, each change group is preceded by a marker line like `{HUNK_MARKER_PREFIX} 1@@`.\n\n\
For every hunk, repeat its marker line `{HUNK_MARKER_PREFIX} <n>@@` exactly on its own line, \
then explain that hunk {verbosity}. Cover every hunk in order, and output nothing except the \
markers and their explanations. Use plain Markdown; do not ask follow-up questions.\n\n\
{numbered_diff}\n",
        verbosity = style.hunk_instruction(),
    )
}

fn status_label(status: FileChangeStatus) -> &'static str {
    match status {
        FileChangeStatus::Added => "added",
        FileChangeStatus::Deleted => "deleted",
        FileChangeStatus::Modified => "modified",
        FileChangeStatus::Renamed => "renamed",
    }
}

/// Drives an `Explainer` port for a single prompt, forwarding each delta to
/// `on_delta` and returning the full text. Thin, but the seam where the port
/// is exercised without a process or Tauri runtime.
pub async fn explain_diff(
    explainer: &dyn Explainer,
    prompt: String,
    on_delta: &(dyn Fn(String) + Send + Sync),
) -> Result<String, AppError> {
    explainer.explain(prompt, on_delta).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::branch_management::features::diff_explanation::agent::test_support::{
        FakeExplainer, RecordingSink,
    };
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    #[test]
    fn build_file_diff_text_renders_unified_diff() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/x"]);
        commit_file(
            path,
            "test.txt",
            "updated\n",
            "Update test.txt",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let text =
            build_file_diff_text(path, DiffTarget::Branch("feature/x"), "test.txt", None).unwrap();
        assert!(text.contains("diff --git a/test.txt b/test.txt"));
        assert!(text.contains("status: modified"));
        assert!(text.contains("+updated"));
        assert!(text.contains("-test content"));
    }

    #[test]
    fn list_target_file_paths_returns_changed_paths() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/list"]);
        commit_file(path, "a.txt", "a\n", "Add a", "2024-01-01T10:00:00");
        commit_file(path, "b.txt", "b\n", "Add b", "2024-01-01T10:01:00");
        run_git(path, &["checkout", "main"]);

        let mut paths = list_target_file_paths(path, DiffTarget::Branch("feature/list")).unwrap();
        paths.sort();
        assert_eq!(paths, vec!["a.txt".to_string(), "b.txt".to_string()]);
    }

    #[test]
    fn render_diff_marks_binary_files() {
        let diff = FileDiff {
            path: "logo.png".to_string(),
            old_path: None,
            status: FileChangeStatus::Added,
            is_binary: true,
            truncated: false,
            hunks: Vec::new(),
        };
        let text = render_diff(&diff);
        assert!(text.contains("status: added"));
        assert!(text.contains("Binary files differ"));
    }

    #[test]
    fn render_diff_notes_truncation_and_rename_header() {
        let diff = FileDiff {
            path: "new.txt".to_string(),
            old_path: Some("old.txt".to_string()),
            status: FileChangeStatus::Renamed,
            is_binary: false,
            truncated: true,
            hunks: Vec::new(),
        };
        let text = render_diff(&diff);
        assert!(text.contains("diff --git a/old.txt b/new.txt"));
        assert!(text.contains("status: renamed"));
        assert!(text.contains("truncated"));
    }

    #[test]
    fn build_hunk_request_numbers_hunks_and_returns_headers() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/hunks"]);
        commit_file(
            path,
            "test.txt",
            "changed\n",
            "Change test.txt",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let (prompt, headers) = build_hunk_explanation_request(
            path,
            DiffTarget::Branch("feature/hunks"),
            "test.txt",
            None,
            ExplanationStyle::Succinct,
        )
        .unwrap();

        assert_eq!(headers.len(), 1);
        assert!(headers[0].starts_with("@@"));
        // The prompt embeds a numbered marker and the style verbosity.
        assert!(prompt.contains("@@HUNK 1@@"));
        assert!(prompt.contains("single short sentence"));
        assert!(prompt.contains("+changed"));
    }

    #[test]
    fn build_hunk_request_yields_no_prompt_for_hunkless_files() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        // A pure rename has no textual hunks.
        run_git(path, &["checkout", "-b", "feature/rename"]);
        run_git(path, &["mv", "test.txt", "renamed.txt"]);
        run_git(path, &["commit", "-m", "Rename"]);
        run_git(path, &["checkout", "main"]);

        let (prompt, headers) = build_hunk_explanation_request(
            path,
            DiffTarget::Branch("feature/rename"),
            "renamed.txt",
            Some("test.txt"),
            ExplanationStyle::Succinct,
        )
        .unwrap();
        assert!(headers.is_empty());
        assert!(prompt.is_empty());
    }

    #[test]
    fn render_numbered_diff_marks_each_hunk() {
        let hunk = |header: &str| {
            crate::domains::branch_management::features::branch_diff::models::DiffHunk {
                header: header.to_string(),
                old_start: 1,
                old_lines: 1,
                new_start: 1,
                new_lines: 1,
                lines: Vec::new(),
            }
        };
        let diff = FileDiff {
            path: "a.ts".to_string(),
            old_path: None,
            status: FileChangeStatus::Modified,
            is_binary: false,
            truncated: false,
            hunks: vec![hunk("@@ -1 +1 @@"), hunk("@@ -9 +9 @@")],
        };
        let (text, headers) = render_numbered_diff(&diff);
        assert!(text.contains("@@HUNK 1@@"));
        assert!(text.contains("@@HUNK 2@@"));
        assert_eq!(
            headers,
            vec!["@@ -1 +1 @@".to_string(), "@@ -9 +9 @@".to_string()]
        );
    }

    #[tokio::test]
    async fn explain_diff_forwards_deltas_and_returns_full_text() {
        let sink = RecordingSink::default();
        let explainer = FakeExplainer::scripted(&["This ", "changed."]);
        let text = explain_diff(&explainer, "prompt".to_string(), &|d| sink.push(d))
            .await
            .unwrap();
        assert_eq!(text, "This changed.");
        assert_eq!(sink.joined(), "This changed.");
    }

    #[tokio::test]
    async fn explain_diff_propagates_agent_errors() {
        let explainer =
            FakeExplainer::failing(AppError::new("nope".to_string(), "agent_failed", None));
        let err = explain_diff(&explainer, "p".to_string(), &|_| {})
            .await
            .unwrap_err();
        assert_eq!(err.kind, "agent_failed");
    }
}

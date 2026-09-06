//! Delivery commands for the branch/commit diff view.
//!
//! Each input names its diff target with exactly one of `branch_name` /
//! `commit_sha` (an explicit `kind` discriminant would be nicer, but flat
//! optionals keep the generated bindings simple). Diff extraction runs on the
//! blocking pool — tree-to-tree diffs of large branches are CPU-bound.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::application as diff;
use super::git::DiffTarget;
use super::models::{ChangedFile, DiffHunk, FileChangeStatus};
use crate::domains::branch_management::core::models::branch_name::BranchName;
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::shared::error::AppError;

/// Maps a `spawn_blocking` join failure (panic/cancellation) to an `AppError`.
fn join_error(e: tokio::task::JoinError) -> AppError {
    AppError::new(
        "Diff operation failed".to_string(),
        "diff_failed",
        Some(e.to_string()),
    )
}

/// A validated diff target: exactly one of branch / commit.
enum ValidatedTarget {
    Branch(BranchName),
    Commit(CommitSha),
}

impl ValidatedTarget {
    /// Validates that exactly one target is present and that it is
    /// well-formed. Runs at the delivery boundary, before any git work.
    fn new(branch_name: Option<String>, commit_sha: Option<String>) -> Result<Self, AppError> {
        match (branch_name, commit_sha) {
            (Some(branch), None) => Ok(Self::Branch(BranchName::new(branch)?)),
            (None, Some(sha)) => Ok(Self::Commit(CommitSha::new(sha)?)),
            _ => Err(AppError::new(
                "A diff target requires exactly one of branchName or commitSha".to_string(),
                "invalid_diff_target",
                None,
            )),
        }
    }

    fn as_diff_target(&self) -> DiffTarget<'_> {
        match self {
            Self::Branch(name) => DiffTarget::Branch(name.as_str()),
            Self::Commit(sha) => DiffTarget::Commit(sha.as_str()),
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListChangedFilesInput {
    /// Filesystem path to the repository (frontend resolves this from the repo id).
    pub path: String,
    /// Diff a branch against its merge-base with HEAD. Mutually exclusive
    /// with `commit_sha`.
    #[serde(default)]
    pub branch_name: Option<String>,
    /// Diff a commit against its first parent. Mutually exclusive with
    /// `branch_name`.
    #[serde(default)]
    pub commit_sha: Option<String>,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ListChangedFilesOutput {
    pub files: Vec<ChangedFile>,
    /// Sum of per-file added lines.
    pub lines_added: u32,
    /// Sum of per-file removed lines.
    pub lines_removed: u32,
}

/// Lists every file changed by a branch (vs merge-base with HEAD) or a
/// commit (vs its first parent), with per-file line stats.
#[tauri::command(async)]
#[specta::specta]
pub async fn list_changed_files(
    input: ListChangedFilesInput,
) -> Result<ListChangedFilesOutput, AppError> {
    let target = ValidatedTarget::new(input.branch_name, input.commit_sha)?;

    let files = tokio::task::spawn_blocking(move || {
        diff::list_changed_files(Path::new(&input.path), target.as_diff_target())
    })
    .await
    .map_err(join_error)??;

    let lines_added = files
        .iter()
        .map(|f| f.lines_added)
        .fold(0u32, u32::saturating_add);
    let lines_removed = files
        .iter()
        .map(|f| f.lines_removed)
        .fold(0u32, u32::saturating_add);

    Ok(ListChangedFilesOutput {
        files,
        lines_added,
        lines_removed,
    })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetFileDiffInput {
    pub path: String,
    /// See [`ListChangedFilesInput::branch_name`].
    #[serde(default)]
    pub branch_name: Option<String>,
    /// See [`ListChangedFilesInput::commit_sha`].
    #[serde(default)]
    pub commit_sha: Option<String>,
    /// Path of the file in the target tree (as returned by `list_changed_files`).
    pub file_path: String,
    /// Rename source path — pass `ChangedFile.old_path` through so rename
    /// detection can pair both sides.
    #[serde(default)]
    pub old_path: Option<String>,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetFileDiffOutput {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileChangeStatus,
    /// Binary files carry no hunks.
    pub is_binary: bool,
    /// True when the diff exceeded the per-file line cap and was cut short.
    pub truncated: bool,
    pub hunks: Vec<DiffHunk>,
}

/// The full textual diff (hunks with old/new line numbers) of one file
/// changed by the target.
#[tauri::command(async)]
#[specta::specta]
pub async fn get_file_diff(input: GetFileDiffInput) -> Result<GetFileDiffOutput, AppError> {
    let target = ValidatedTarget::new(input.branch_name, input.commit_sha)?;

    let file = tokio::task::spawn_blocking(move || {
        diff::get_file_diff(
            Path::new(&input.path),
            target.as_diff_target(),
            &input.file_path,
            input.old_path.as_deref(),
        )
    })
    .await
    .map_err(join_error)??;

    Ok(GetFileDiffOutput {
        path: file.path,
        old_path: file.old_path,
        status: file.status,
        is_binary: file.is_binary,
        truncated: file.truncated,
        hunks: file.hunks,
    })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetFileLinesInput {
    pub path: String,
    /// See [`ListChangedFilesInput::branch_name`].
    #[serde(default)]
    pub branch_name: Option<String>,
    /// See [`ListChangedFilesInput::commit_sha`].
    #[serde(default)]
    pub commit_sha: Option<String>,
    /// Path of the file on the diff's target side.
    pub file_path: String,
    /// First line of the range, 1-based inclusive.
    pub start_line: u32,
    /// Last line of the range, inclusive. `0` means "through end of file".
    pub end_line: u32,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetFileLinesOutput {
    /// The requested lines (trailing newlines stripped). Empty for binary
    /// files or ranges past the end of the file.
    pub lines: Vec<String>,
    /// Total number of lines in the file on the target side.
    pub total_lines: u32,
}

/// Reads a line range of a file as it exists on the diff's target side —
/// used by the diff view to expand the hidden context between hunks.
#[tauri::command(async)]
#[specta::specta]
pub async fn get_file_lines(input: GetFileLinesInput) -> Result<GetFileLinesOutput, AppError> {
    let target = ValidatedTarget::new(input.branch_name, input.commit_sha)?;

    let (lines, total_lines) = tokio::task::spawn_blocking(move || {
        diff::get_file_lines(
            Path::new(&input.path),
            target.as_diff_target(),
            &input.file_path,
            input.start_line,
            input.end_line,
        )
    })
    .await
    .map_err(join_error)??;

    Ok(GetFileLinesOutput { lines, total_lines })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    fn setup_branch_repo() -> tempfile::TempDir {
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
        repo
    }

    #[tokio::test]
    async fn list_changed_files_requires_exactly_one_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path().display().to_string();

        let err = list_changed_files(ListChangedFilesInput {
            path: path.clone(),
            branch_name: None,
            commit_sha: None,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_diff_target");

        let err = list_changed_files(ListChangedFilesInput {
            path,
            branch_name: Some("main".to_string()),
            commit_sha: Some("abc1234".to_string()),
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_diff_target");
    }

    #[tokio::test]
    async fn list_changed_files_validates_target_at_the_boundary() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path().display().to_string();

        let err = list_changed_files(ListChangedFilesInput {
            path: path.clone(),
            branch_name: Some("bad name with spaces".to_string()),
            commit_sha: None,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_branch_name");

        let err = list_changed_files(ListChangedFilesInput {
            path,
            branch_name: None,
            commit_sha: Some("not-a-sha".to_string()),
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_commit_sha");
    }

    #[tokio::test]
    async fn list_changed_files_returns_files_and_totals() {
        let _guard = DirectoryGuard::new();
        let repo = setup_branch_repo();

        let output = list_changed_files(ListChangedFilesInput {
            path: repo.path().display().to_string(),
            branch_name: Some("feature/x".to_string()),
            commit_sha: None,
        })
        .await
        .unwrap();

        assert_eq!(output.files.len(), 1);
        assert_eq!(output.files[0].path, "test.txt");
        assert_eq!(output.lines_added, 1);
        assert_eq!(output.lines_removed, 1);
    }

    #[tokio::test]
    async fn get_file_diff_returns_hunks_for_a_commit_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_branch_repo();
        run_git(repo.path(), &["checkout", "feature/x"]);
        let tip = run_git(repo.path(), &["rev-parse", "HEAD"]);
        run_git(repo.path(), &["checkout", "main"]);

        let output = get_file_diff(GetFileDiffInput {
            path: repo.path().display().to_string(),
            branch_name: None,
            commit_sha: Some(tip),
            file_path: "test.txt".to_string(),
            old_path: None,
        })
        .await
        .unwrap();

        assert_eq!(output.path, "test.txt");
        assert_eq!(output.status, FileChangeStatus::Modified);
        assert!(!output.is_binary);
        assert!(!output.truncated);
        assert_eq!(output.hunks.len(), 1);
    }

    #[tokio::test]
    async fn get_file_lines_returns_the_range_and_total() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/lines"]);
        commit_file(
            path,
            "test.txt",
            "one\ntwo\nthree\n",
            "Three lines",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let output = get_file_lines(GetFileLinesInput {
            path: path.display().to_string(),
            branch_name: Some("feature/lines".to_string()),
            commit_sha: None,
            file_path: "test.txt".to_string(),
            start_line: 2,
            end_line: 0,
        })
        .await
        .unwrap();

        assert_eq!(output.lines, vec!["two", "three"]);
        assert_eq!(output.total_lines, 3);
    }

    #[tokio::test]
    async fn get_file_lines_validates_the_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = get_file_lines(GetFileLinesInput {
            path: repo.path().display().to_string(),
            branch_name: None,
            commit_sha: None,
            file_path: "test.txt".to_string(),
            start_line: 1,
            end_line: 0,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_diff_target");
    }

    #[tokio::test]
    async fn get_file_diff_surfaces_missing_file_error() {
        let _guard = DirectoryGuard::new();
        let repo = setup_branch_repo();

        let err = get_file_diff(GetFileDiffInput {
            path: repo.path().display().to_string(),
            branch_name: Some("feature/x".to_string()),
            commit_sha: None,
            file_path: "missing.txt".to_string(),
            old_path: None,
        })
        .await
        .unwrap_err();

        assert_eq!(err.kind, "diff_file_not_found");
    }
}

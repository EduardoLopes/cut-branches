//! git2-backed diff extraction for the review view.
//!
//! Both operations resolve the same pair of trees: for a branch target, the
//! branch tip vs its merge-base with HEAD (so only the branch's own work
//! counts — the same baseline as `get_branch_diff_stats`); for a commit
//! target, the commit vs its first parent (the root commit diffs against the
//! empty tree). Rename detection runs on every diff so a moved file shows as
//! one entry instead of an add + delete pair.

use std::cell::RefCell;
use std::path::Path;

use git2::{BranchType, DiffOptions, Repository, Tree};

use super::models::{ChangedFile, DiffHunk, DiffLine, DiffLineKind, FileDiff};
use crate::domains::branch_management::error::BranchError;
pub(crate) use crate::domains::branch_management::infrastructure::git::diff::DiffTarget;
use crate::domains::branch_management::infrastructure::git::diff::{
    build_diff, delta_paths, map_status, open_repo, resolve_trees,
};

/// Per-file cap on extracted diff lines: past this the hunks stop growing and
/// the result is flagged `truncated` (generated bundles, lockfiles).
const MAX_FILE_DIFF_LINES: usize = 10_000;

/// Lists every file changed by the target, with per-file line stats.
pub fn list_changed_files(
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<Vec<ChangedFile>, BranchError> {
    let repo = open_repo(path)?;
    let (base_tree, target_tree) = resolve_trees(&repo, path, target)?;
    let diff = build_diff(&repo, base_tree.as_ref(), &target_tree, target, None)?;

    // git2's foreach takes independent FnMut callbacks, so shared accumulation
    // goes through a RefCell. Files arrive before their lines, in order, so
    // line counts always apply to the last pushed entry.
    let files: RefCell<Vec<ChangedFile>> = RefCell::new(Vec::new());

    diff.foreach(
        &mut |delta, _| {
            let (file_path, old_path) = delta_paths(&delta);
            files.borrow_mut().push(ChangedFile {
                path: file_path,
                old_path,
                status: map_status(delta.status()),
                lines_added: 0,
                lines_removed: 0,
                is_binary: delta.flags().is_binary(),
            });
            true
        },
        Some(&mut |_, _| {
            if let Some(file) = files.borrow_mut().last_mut() {
                file.is_binary = true;
            }
            true
        }),
        None,
        Some(&mut |_, _, line| {
            if let Some(file) = files.borrow_mut().last_mut() {
                match line.origin() {
                    '+' => file.lines_added = file.lines_added.saturating_add(1),
                    '-' => file.lines_removed = file.lines_removed.saturating_add(1),
                    _ => {}
                }
            }
            true
        }),
    )
    .map_err(|source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    })?;

    Ok(files.into_inner())
}

/// Cap on lines returned by a single context-expansion request.
const MAX_CONTEXT_LINES: usize = 5_000;

/// Resolves just the target-side tree (branch tip / commit) — the side whose
/// file content backs context expansion in the diff view.
fn resolve_target_tree<'r>(
    repo: &'r Repository,
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<Tree<'r>, BranchError> {
    let diff_err = |source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    };

    match target {
        DiffTarget::Branch(name) => {
            let branch = repo.find_branch(name, BranchType::Local).map_err(|e| {
                BranchError::FindBranchFailed {
                    name: name.to_string(),
                    source: e,
                }
            })?;
            branch
                .get()
                .peel_to_commit()
                .map_err(|e| BranchError::BranchCommitFailed { source: e })?
                .tree()
                .map_err(diff_err)
        }
        DiffTarget::Commit(sha) => repo
            .revparse_single(sha)
            .ok()
            .and_then(|obj| obj.peel_to_commit().ok())
            .ok_or_else(|| BranchError::CommitNotFoundInRepo {
                sha: sha.to_string(),
                path: path.display().to_string(),
            })?
            .tree()
            .map_err(diff_err),
    }
}

/// Reads a 1-based, inclusive line range of a file as it exists in the
/// target tree — the data source for "expand hidden lines" between hunks.
/// `end_line == 0` means "through the end of the file". Returns the lines
/// plus the file's total line count. Binary files yield no lines.
pub fn get_file_lines(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    start_line: u32,
    end_line: u32,
) -> Result<(Vec<String>, u32), BranchError> {
    let repo = open_repo(path)?;
    let tree = resolve_target_tree(&repo, path, target)?;

    let diff_err = |source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    };

    let entry = tree
        .get_path(Path::new(file_path))
        .map_err(|_| BranchError::DiffFileNotFound {
            path: file_path.to_string(),
        })?;
    let blob = entry
        .to_object(&repo)
        .and_then(|obj| obj.peel_to_blob())
        .map_err(diff_err)?;

    if blob.is_binary() {
        return Ok((Vec::new(), 0));
    }

    let content = String::from_utf8_lossy(blob.content()).into_owned();
    let all: Vec<&str> = content.lines().collect();
    let total = u32::try_from(all.len()).unwrap_or(u32::MAX);

    let start = start_line.max(1);
    let end = if end_line == 0 {
        total
    } else {
        end_line.min(total)
    };
    if start > end {
        return Ok((Vec::new(), total));
    }

    let lines = all[(start as usize - 1)..(end as usize)]
        .iter()
        .take(MAX_CONTEXT_LINES)
        .map(|line| (*line).to_string())
        .collect();

    Ok((lines, total))
}

struct FileDiffState {
    file: Option<FileDiff>,
    line_count: usize,
}

/// Extracts the hunks of a single file's diff. `old_path` (from the
/// changed-files list) must be passed for renames so both sides survive the
/// pathspec filter and rename detection can pair them.
pub fn get_file_diff(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    old_path: Option<&str>,
) -> Result<FileDiff, BranchError> {
    let repo = open_repo(path)?;
    let (base_tree, target_tree) = resolve_trees(&repo, path, target)?;

    let mut opts = DiffOptions::new();
    opts.pathspec(file_path);
    if let Some(old) = old_path {
        opts.pathspec(old);
    }

    let diff = build_diff(
        &repo,
        base_tree.as_ref(),
        &target_tree,
        target,
        Some(&mut opts),
    )?;

    let matches = |delta: &git2::DiffDelta<'_>| delta_paths(delta).0 == file_path;
    let state = RefCell::new(FileDiffState {
        file: None,
        line_count: 0,
    });

    diff.foreach(
        &mut |delta, _| {
            if matches(&delta) {
                let (file_path, old_path) = delta_paths(&delta);
                state.borrow_mut().file = Some(FileDiff {
                    path: file_path,
                    old_path,
                    status: map_status(delta.status()),
                    is_binary: delta.flags().is_binary(),
                    truncated: false,
                    hunks: Vec::new(),
                });
            }
            true
        },
        Some(&mut |delta, _| {
            if matches(&delta) {
                if let Some(file) = state.borrow_mut().file.as_mut() {
                    file.is_binary = true;
                }
            }
            true
        }),
        Some(&mut |delta, hunk| {
            if matches(&delta) {
                let mut state = state.borrow_mut();
                if state.line_count >= MAX_FILE_DIFF_LINES {
                    if let Some(file) = state.file.as_mut() {
                        file.truncated = true;
                    }
                } else if let Some(file) = state.file.as_mut() {
                    file.hunks.push(DiffHunk {
                        header: String::from_utf8_lossy(hunk.header())
                            .trim_end_matches(['\n', '\r'])
                            .to_string(),
                        old_start: hunk.old_start(),
                        old_lines: hunk.old_lines(),
                        new_start: hunk.new_start(),
                        new_lines: hunk.new_lines(),
                        lines: Vec::new(),
                    });
                }
            }
            true
        }),
        Some(&mut |delta, _, line| {
            if !matches(&delta) {
                return true;
            }
            let kind = match line.origin() {
                '+' => DiffLineKind::Added,
                '-' => DiffLineKind::Removed,
                ' ' => DiffLineKind::Context,
                // EOF-newline markers and file headers carry no code.
                _ => return true,
            };
            let mut state = state.borrow_mut();
            if state.line_count >= MAX_FILE_DIFF_LINES {
                if let Some(file) = state.file.as_mut() {
                    file.truncated = true;
                }
                return true;
            }
            state.line_count += 1;
            let diff_line = DiffLine {
                kind,
                content: String::from_utf8_lossy(line.content())
                    .trim_end_matches(['\n', '\r'])
                    .to_string(),
                old_line_no: line.old_lineno(),
                new_line_no: line.new_lineno(),
            };
            if let Some(hunk) = state.file.as_mut().and_then(|file| file.hunks.last_mut()) {
                hunk.lines.push(diff_line);
            }
            true
        }),
    )
    .map_err(|source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    })?;

    state
        .into_inner()
        .file
        .ok_or_else(|| BranchError::DiffFileNotFound {
            path: file_path.to_string(),
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::branch_management::core::models::file_change_status::FileChangeStatus;
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    /// main has test.txt; feature branch modifies it and adds new.txt.
    fn setup_diff_repo() -> tempfile::TempDir {
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/diff"]);
        commit_file(
            path,
            "test.txt",
            "changed content\nsecond line\n",
            "Change test.txt",
            "2024-01-01T10:00:00",
        );
        commit_file(
            path,
            "new.txt",
            "brand new\n",
            "Add new.txt",
            "2024-01-01T10:01:00",
        );
        run_git(path, &["checkout", "main"]);
        repo
    }

    #[test]
    fn list_changed_files_for_branch_reports_files_and_stats() {
        let _guard = DirectoryGuard::new();
        let repo = setup_diff_repo();

        let files = list_changed_files(repo.path(), DiffTarget::Branch("feature/diff")).unwrap();

        assert_eq!(files.len(), 2);
        let new = files.iter().find(|f| f.path == "new.txt").unwrap();
        assert_eq!(new.status, FileChangeStatus::Added);
        assert_eq!(new.lines_added, 1);
        assert_eq!(new.lines_removed, 0);
        assert!(!new.is_binary);

        let modified = files.iter().find(|f| f.path == "test.txt").unwrap();
        assert_eq!(modified.status, FileChangeStatus::Modified);
        assert_eq!(modified.lines_added, 2);
        assert_eq!(modified.lines_removed, 1);
    }

    #[test]
    fn list_changed_files_for_commit_diffs_against_parent() {
        let _guard = DirectoryGuard::new();
        let repo = setup_diff_repo();
        run_git(repo.path(), &["checkout", "feature/diff"]);
        let tip = run_git(repo.path(), &["rev-parse", "HEAD"]);
        run_git(repo.path(), &["checkout", "main"]);

        let files = list_changed_files(repo.path(), DiffTarget::Commit(&tip)).unwrap();

        // The tip commit only added new.txt.
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "new.txt");
        assert_eq!(files[0].status, FileChangeStatus::Added);
    }

    #[test]
    fn list_changed_files_for_root_commit_diffs_against_empty_tree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let root = run_git(repo.path(), &["rev-list", "--max-parents=0", "HEAD"]);

        let files = list_changed_files(repo.path(), DiffTarget::Commit(&root)).unwrap();

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "test.txt");
        assert_eq!(files[0].status, FileChangeStatus::Added);
    }

    #[test]
    fn list_changed_files_detects_renames() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/rename"]);
        run_git(path, &["mv", "test.txt", "renamed.txt"]);
        run_git(path, &["commit", "-m", "Rename test.txt"]);
        run_git(path, &["checkout", "main"]);

        let files = list_changed_files(repo.path(), DiffTarget::Branch("feature/rename")).unwrap();

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "renamed.txt");
        assert_eq!(files[0].old_path.as_deref(), Some("test.txt"));
        assert_eq!(files[0].status, FileChangeStatus::Renamed);
    }

    #[test]
    fn get_file_diff_returns_hunks_with_line_numbers() {
        let _guard = DirectoryGuard::new();
        let repo = setup_diff_repo();

        let diff = get_file_diff(
            repo.path(),
            DiffTarget::Branch("feature/diff"),
            "test.txt",
            None,
        )
        .unwrap();

        assert_eq!(diff.path, "test.txt");
        assert_eq!(diff.status, FileChangeStatus::Modified);
        assert!(!diff.is_binary);
        assert!(!diff.truncated);
        assert_eq!(diff.hunks.len(), 1);

        let hunk = &diff.hunks[0];
        assert!(hunk.header.starts_with("@@"));
        let removed: Vec<_> = hunk
            .lines
            .iter()
            .filter(|l| l.kind == DiffLineKind::Removed)
            .collect();
        let added: Vec<_> = hunk
            .lines
            .iter()
            .filter(|l| l.kind == DiffLineKind::Added)
            .collect();
        assert_eq!(removed.len(), 1);
        assert_eq!(removed[0].content, "test content");
        assert_eq!(removed[0].old_line_no, Some(1));
        assert_eq!(removed[0].new_line_no, None);
        assert_eq!(added.len(), 2);
        assert_eq!(added[0].content, "changed content");
        assert_eq!(added[0].new_line_no, Some(1));
        assert_eq!(added[0].old_line_no, None);
    }

    #[test]
    fn get_file_diff_follows_renames_when_old_path_is_given() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/rename"]);
        run_git(path, &["mv", "test.txt", "renamed.txt"]);
        run_git(path, &["commit", "-m", "Rename test.txt"]);
        run_git(path, &["checkout", "main"]);

        let diff = get_file_diff(
            repo.path(),
            DiffTarget::Branch("feature/rename"),
            "renamed.txt",
            Some("test.txt"),
        )
        .unwrap();

        assert_eq!(diff.status, FileChangeStatus::Renamed);
        assert_eq!(diff.old_path.as_deref(), Some("test.txt"));
        // Pure rename: no content hunks.
        assert!(diff.hunks.is_empty());
    }

    #[test]
    fn get_file_diff_rejects_files_outside_the_diff() {
        let _guard = DirectoryGuard::new();
        let repo = setup_diff_repo();

        let err = get_file_diff(
            repo.path(),
            DiffTarget::Branch("feature/diff"),
            "does-not-exist.txt",
            None,
        )
        .unwrap_err();

        assert!(matches!(err, BranchError::DiffFileNotFound { .. }));
    }

    #[test]
    fn get_file_lines_reads_ranges_from_the_target_tree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/lines"]);
        commit_file(
            path,
            "test.txt",
            "one\ntwo\nthree\nfour\nfive\n",
            "Five lines",
            "2024-01-01T10:00:00",
        );
        run_git(path, &["checkout", "main"]);

        let (lines, total) =
            get_file_lines(path, DiffTarget::Branch("feature/lines"), "test.txt", 2, 4).unwrap();
        assert_eq!(lines, vec!["two", "three", "four"]);
        assert_eq!(total, 5);

        // end_line == 0 means "through EOF"; start is clamped to 1.
        let (lines, total) =
            get_file_lines(path, DiffTarget::Branch("feature/lines"), "test.txt", 0, 0).unwrap();
        assert_eq!(lines.len(), 5);
        assert_eq!(total, 5);

        // A range past EOF yields no lines but still reports the total.
        let (lines, total) =
            get_file_lines(path, DiffTarget::Branch("feature/lines"), "test.txt", 9, 12).unwrap();
        assert!(lines.is_empty());
        assert_eq!(total, 5);
    }

    #[test]
    fn get_file_lines_rejects_files_missing_from_the_target_tree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = get_file_lines(
            repo.path(),
            DiffTarget::Branch("main"),
            "missing.txt",
            1,
            10,
        )
        .unwrap_err();
        assert!(matches!(err, BranchError::DiffFileNotFound { .. }));
    }

    #[test]
    fn unknown_branch_and_commit_targets_error() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = list_changed_files(repo.path(), DiffTarget::Branch("nope")).unwrap_err();
        assert!(matches!(err, BranchError::FindBranchFailed { .. }));

        let err = list_changed_files(
            repo.path(),
            DiffTarget::Commit("0000000000000000000000000000000000000000"),
        )
        .unwrap_err();
        assert!(matches!(err, BranchError::CommitNotFoundInRepo { .. }));
    }
}

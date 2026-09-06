//! Use-cases for the branch/commit diff view.
//!
//! Thin orchestration over the feature's git infrastructure; boundary
//! validation (value objects) happens in the command layer.

use std::path::Path;

use super::git::{self, DiffTarget};
use super::models::{ChangedFile, FileDiff};
use crate::shared::error::AppError;

/// Every file changed by the target, with per-file line stats.
pub fn list_changed_files(
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<Vec<ChangedFile>, AppError> {
    Ok(git::list_changed_files(path, target)?)
}

/// The full textual diff (hunks + lines) of one changed file.
pub fn get_file_diff(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    old_path: Option<&str>,
) -> Result<FileDiff, AppError> {
    Ok(git::get_file_diff(path, target, file_path, old_path)?)
}

/// A 1-based, inclusive line range of the file on the diff's target side —
/// backs "expand hidden lines" between hunks. Returns `(lines, total_lines)`.
pub fn get_file_lines(
    path: &Path,
    target: DiffTarget<'_>,
    file_path: &str,
    start_line: u32,
    end_line: u32,
) -> Result<(Vec<String>, u32), AppError> {
    Ok(git::get_file_lines(
        path, target, file_path, start_line, end_line,
    )?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    #[test]
    fn use_cases_pass_through_to_infrastructure() {
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

        let files = list_changed_files(path, DiffTarget::Branch("feature/x")).unwrap();
        assert_eq!(files.len(), 1);

        let diff = get_file_diff(path, DiffTarget::Branch("feature/x"), "test.txt", None).unwrap();
        assert_eq!(diff.path, "test.txt");
        assert!(!diff.hunks.is_empty());

        let (lines, total) =
            get_file_lines(path, DiffTarget::Branch("feature/x"), "test.txt", 1, 0).unwrap();
        assert_eq!(lines, vec!["updated"]);
        assert_eq!(total, 1);
    }

    #[test]
    fn use_cases_convert_domain_errors_to_app_errors() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = list_changed_files(repo.path(), DiffTarget::Branch("missing")).unwrap_err();
        assert_eq!(err.kind, "branch_not_found");
    }
}

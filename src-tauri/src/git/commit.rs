use git2::Repository;
use std::path::Path;

use crate::error::AppError;

pub fn is_commit_reachable(path: &Path, commit_sha: &str) -> Result<bool, AppError> {
    if commit_sha.is_empty() {
        return Ok(false);
    }

    let repo = match Repository::open(path) {
        Ok(repo) => repo,
        Err(_) => return Ok(false), // Return false for non-git directories
    };

    // Use revparse_single to handle both full and short SHA hashes
    let result = repo.revparse_single(commit_sha).is_ok();
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[test]
    fn test_is_commit_reachable() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let result = is_commit_reachable(path, &commit_sha);
        assert!(result.is_ok());
        assert!(result.unwrap(), "Current HEAD commit should be reachable");

        let invalid_sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
        let result = is_commit_reachable(path, invalid_sha);
        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "Non-existent commit should not be reachable"
        );
    }

    #[test]
    fn test_is_commit_reachable_comprehensive() {
        let _guard = DirectoryGuard::new();
        let non_git_dir = tempfile::tempdir().unwrap();
        let non_git_path = non_git_dir.path();
        let dummy_sha = "0123456789abcdef0123456789abcdef01234567";
        let result = is_commit_reachable(non_git_path, dummy_sha);
        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "is_commit_reachable should return false for non-git directories"
        );

        let repo = setup_test_repo();
        let path = repo.path();
        let commit_output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let full_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        let short_sha = full_sha[..7].to_string();
        let result = is_commit_reachable(path, &short_sha);
        assert!(result.is_ok());
        assert!(result.unwrap(), "Short SHA should be reachable");

        let non_existent_sha = "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f"; // unlikely to exist
        let result = is_commit_reachable(path, non_existent_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Non-existent SHA should not be reachable");

        let malformed_sha = "not-a-sha";
        let result = is_commit_reachable(path, malformed_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Malformed SHA should not be reachable");

        let empty_sha = "";
        let result = is_commit_reachable(path, empty_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Empty SHA should not be reachable");
    }
}

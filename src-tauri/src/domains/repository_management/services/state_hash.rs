use std::path::Path;

use crate::shared::error::AppError;

/// Computes a fast timestamp representing the current state of the repository.
/// This timestamp changes when branches are added, deleted, or commits are made.
///
/// Uses filesystem mtimes which is much faster than git2 API calls:
/// - `.git/refs/heads/` directory mtime (changes when branches added/deleted)
/// - `.git/packed-refs` file mtime (changes when refs are packed)
/// - `.git/HEAD` file mtime (changes when HEAD moves/commits made)
///
/// This is extremely fast (~0.5-2ms) regardless of repository size.
///
/// # Arguments
///
/// * `path` - Path to the git repository
///
/// # Returns
///
/// * `Result<i32, AppError>` - Unix timestamp (seconds since epoch) or an error
pub fn compute_repo_state_timestamp(path: &Path) -> Result<i32, AppError> {
    let git_dir = path.join(".git");

    // Check if .git exists
    if !git_dir.exists() {
        return Err(AppError::new(
            format!("Not a git repository: {}", path.display()),
            "not_git_repository",
            None,
        ));
    }

    let mut max_timestamp: i32 = 0;

    // Check .git/refs/heads/ directory mtime
    let refs_heads = git_dir.join("refs").join("heads");
    if refs_heads.exists() {
        if let Ok(metadata) = std::fs::metadata(&refs_heads) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    max_timestamp = max_timestamp.max(duration.as_secs() as i32);
                }
            }
        }
    }

    // Check .git/packed-refs file mtime
    let packed_refs = git_dir.join("packed-refs");
    if packed_refs.exists() {
        if let Ok(metadata) = std::fs::metadata(&packed_refs) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    max_timestamp = max_timestamp.max(duration.as_secs() as i32);
                }
            }
        }
    }

    // Check .git/HEAD file mtime
    let head_file = git_dir.join("HEAD");
    if head_file.exists() {
        if let Ok(metadata) = std::fs::metadata(&head_file) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    max_timestamp = max_timestamp.max(duration.as_secs() as i32);
                }
            }
        }
    }

    // Also check individual ref files in refs/heads/ for changes
    // This catches branch updates even if directory mtime isn't updated
    if refs_heads.exists() {
        if let Ok(entries) = std::fs::read_dir(&refs_heads) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                            max_timestamp = max_timestamp.max(duration.as_secs() as i32);
                        }
                    }
                }
            }
        }
    }

    if max_timestamp == 0 {
        // Fallback: use current time if we couldn't get any timestamps
        // This ensures we at least have a valid timestamp
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| {
                AppError::new(
                    "Failed to get current time".to_string(),
                    "time_error",
                    Some(e.to_string()),
                )
            })?;
        max_timestamp = now.as_secs() as i32;
    }

    Ok(max_timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_compute_repo_state_timestamp() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let ts1 = compute_repo_state_timestamp(path);
        assert!(ts1.is_ok(), "Failed to compute timestamp: {:?}", ts1.err());

        // Timestamp should be consistent (within same second)
        let ts2 = compute_repo_state_timestamp(path);
        assert!(ts2.is_ok());
        assert_eq!(ts1.unwrap(), ts2.unwrap(), "Timestamp should be stable");
    }

    #[test]
    fn test_timestamp_changes_on_new_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let ts1 = compute_repo_state_timestamp(path).unwrap();

        // Sleep to ensure filesystem timestamp changes
        thread::sleep(Duration::from_millis(1100));

        // Create a new branch
        Command::new("git")
            .args(["branch", "test-new-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let ts2 = compute_repo_state_timestamp(path).unwrap();
        assert!(
            ts2 > ts1,
            "Timestamp should increase when new branch is created: {} <= {}",
            ts2,
            ts1
        );
    }

    #[test]
    fn test_timestamp_changes_on_branch_delete() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Create a branch
        Command::new("git")
            .args(["branch", "test-delete-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        // Sleep to ensure filesystem timestamp changes
        thread::sleep(Duration::from_millis(1100));

        let ts1 = compute_repo_state_timestamp(path).unwrap();

        // Sleep again
        thread::sleep(Duration::from_millis(1100));

        // Delete the branch
        Command::new("git")
            .args(["branch", "-D", "test-delete-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let ts2 = compute_repo_state_timestamp(path).unwrap();
        assert!(
            ts2 > ts1,
            "Timestamp should increase when branch is deleted: {} <= {}",
            ts2,
            ts1
        );
    }

    #[test]
    fn test_timestamp_changes_on_new_commit() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let ts1 = compute_repo_state_timestamp(path).unwrap();

        // Sleep to ensure filesystem timestamp changes
        thread::sleep(Duration::from_millis(1100));

        // Create a new commit
        std::fs::write(path.join("test_file.txt"), "test content").unwrap();
        Command::new("git")
            .args(["add", "test_file.txt"])
            .current_dir(path)
            .output()
            .unwrap();
        Command::new("git")
            .args(["commit", "-m", "Test commit"])
            .current_dir(path)
            .output()
            .unwrap();

        let ts2 = compute_repo_state_timestamp(path).unwrap();
        assert!(
            ts2 > ts1,
            "Timestamp should increase when new commit is made: {} <= {}",
            ts2,
            ts1
        );
    }

    #[test]
    fn test_timestamp_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();

        let result = compute_repo_state_timestamp(non_git_path);
        assert!(result.is_err(), "Should error on non-git directory");
    }

    #[test]
    fn test_timestamp_is_recent() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let ts = compute_repo_state_timestamp(path).unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i32;

        // Timestamp should be recent (within last hour)
        assert!(
            now - ts < 3600,
            "Timestamp should be recent: now={}, ts={}, diff={}",
            now,
            ts,
            now - ts
        );
    }
}

extern crate execute;

use std::io::ErrorKind;
use std::process::Command;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::error::Error;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RootPathResponse {
    pub root_path: String,
    pub id: Option<u64>,
}

impl Hash for RootPathResponse {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.root_path.hash(state);
    }
}

/// Checks if the given path is a git repository.
///
/// # Arguments
///
/// * `path` - The path to check
///
/// # Returns
///
/// * `Result<bool, Error>` - true if it's a git repository, or an error
pub fn is_git_repository(path: &Path) -> Result<bool, Error> {
    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    if result.status.success() {
        let output_str = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                None,
            )
        })?;
        Ok(output_str.trim() == "true")
    } else {
        // If `git rev-parse --is-inside-work-tree` fails,
        // it often means it's not a git repository (e.g., prints to stderr: "fatal: not a git repository").
        // In this specific case, we interpret it as Ok(false).
        // For other errors, it would remain an Err from the map_err above or other checks.
        let stderr_str = String::from_utf8_lossy(&result.stderr);
        if stderr_str.contains("not a git repository") {
            Ok(false)
        } else {
            Err(Error::new(
                format!(
                    "Git command failed for path {}: Status: {}. Stderr: {}",
                    path.display(),
                    result.status,
                    stderr_str
                ),
                "git_command_failed", // More generic error kind
                Some(stderr_str.into_owned()),
            ))
        }
    }
}

/// Calculates a hash for a hashable type.
///
/// # Arguments
///
/// * `t` - The value to hash
///
/// # Returns
///
/// * `u64` - The calculated hash
fn calculate_hash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}

/// Gets the root path of a git repository.
///
/// # Arguments
///
/// * `path` - Path to check for a git repository
///
/// # Returns
///
/// * `Result<String, Error>` - JSON string with the root path and ID, or an error
#[tauri::command(async)]
pub async fn get_root(path: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    if !is_git_repository(raw_path)? {
        return Err(Error::new(
            format!(
                "The folder **{}** is not a git repository",
                raw_path
                    .file_name()
                    .unwrap_or_else(|| raw_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            None,
        ));
    }

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(raw_path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!(
                    "Unable to access the path **{}**: {}",
                    raw_path.display(),
                    e
                ),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    raw_path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    if !result.status.success() {
        let stderr = String::from_utf8(result.stderr).map_err(|e| {
            Error::new(
                format!("Failed to parse stderr: {}", e),
                "stderr_parse_failed",
                None,
            )
        })?;

        return Err(Error::new(
            format!(
                "We can't get the toplevel path of this git repository. Make sure the path {0} is a git repository",
                raw_path.display()
            ),
            "is_git_repository", 
            Some(stderr),
        ));
    }

    let rootpath = String::from_utf8(result.stdout).map_err(|e| {
        Error::new(
            format!("Failed to parse stdout: {}", e),
            "stdout_parse_failed",
            None,
        )
    })?;

    let response = RootPathResponse {
        root_path: rootpath.trim().to_string(),
        id: Some(calculate_hash(&rootpath.to_string())),
    };

    Ok(serde_json::to_string(&response).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            None,
        )
    })?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use tempfile::tempdir;

    #[test]
    fn test_is_git_repository() {
        let _guard = DirectoryGuard::new();

        // Test a valid git repository
        let repo = setup_test_repo();
        let path = repo.path();
        let result = is_git_repository(path);
        assert!(
            result.is_ok(),
            "Expected Ok for git repository check, got {:?}",
            result
        );
        assert!(result.unwrap(), "Expected true for git repository");

        // Test with a non-git directory
        let non_git_dir = tempdir().unwrap();
        let non_git_path = non_git_dir.path();
        let result = is_git_repository(non_git_path);
        assert!(
            result.is_ok(),
            "Expected Ok for non-git repository check, got {:?}",
            result
        );
        assert!(!result.unwrap(), "Expected false for non-git repository");

        // Test with a path that does not exist (should be an error from Command::output)
        let non_existent_path = Path::new("/path/that/does/not/exist/ever");
        let result = is_git_repository(non_existent_path);
        assert!(
            result.is_err(),
            "Expected Err for non-existent path, got {:?}",
            result
        );
        // Changed to expect either error kind since they are platform-dependent
        if let Err(e) = result {
            assert!(
                e.kind == "command_execution_failed" || e.kind == "unable_to_access_dir",
                "Expected command_execution_failed or unable_to_access_dir error kind, got {}",
                e.kind
            );
        }
    }

    #[test]
    fn test_calculate_hash() {
        let value1 = "test";
        let value2 = "test";
        let value3 = "different";

        // Same values should produce the same hash
        assert_eq!(calculate_hash(&value1), calculate_hash(&value2));

        // Different values should produce different hashes
        assert_ne!(calculate_hash(&value1), calculate_hash(&value3));
    }

    #[tokio::test]
    async fn test_get_root() {
        // Save current directory
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();
        println!("Working in test repo at: {}", path.display());

        // Get the repository path for a valid git repo
        let path_str = path.to_str().unwrap().to_string();
        let result = get_root(path_str).await;

        // Verify success for valid repo
        assert!(
            result.is_ok(),
            "get_root failed for valid repo: {:?}",
            result.err()
        );
        let response_str = result.unwrap();
        let response: RootPathResponse = serde_json::from_str(&response_str).unwrap();
        assert!(
            response.id.is_some(),
            "No repository ID returned for valid repo"
        );

        // Canonicalize paths for comparison
        let expected_path =
            std::fs::canonicalize(path).expect("Failed to canonicalize expected path");
        let actual_path = std::fs::canonicalize(Path::new(&response.root_path))
            .expect("Failed to canonicalize actual path");
        assert_eq!(
            actual_path, expected_path,
            "Root path mismatch. Expected: {:?}, Got: {:?}",
            expected_path, actual_path
        );

        // Test with a non-git directory
        let non_git_dir = tempdir().unwrap();
        let non_git_path_str = non_git_dir.path().to_str().unwrap().to_string();
        println!(
            "Testing non-git directory at: {}",
            non_git_dir.path().display()
        );
        let result_non_git = get_root(non_git_path_str).await;

        // Verify it fails with the correct error for non-git directory
        assert!(
            result_non_git.is_err(),
            "Expected error for non-git directory"
        );
        if let Err(e) = result_non_git {
            assert_eq!(
                e.kind, "is_not_git_repository",
                "Wrong error kind for non-git directory: {}",
                e.kind
            );
        }

        // Test with a non-existent path
        let non_existent_path_str = "/path/that/does/not/exist/ever".to_string();
        let result_non_existent = get_root(non_existent_path_str).await;
        assert!(
            result_non_existent.is_err(),
            "Expected error for non-existent path"
        );
        if let Err(e) = result_non_existent {
            // Changed to expect either error kind since they are platform-dependent
            assert!(
                e.kind == "command_execution_failed" || e.kind == "unable_to_access_dir",
                "Wrong error kind for non-existent path: {}. Expected command_execution_failed or unable_to_access_dir",
                e.kind
            );
        }
    }
}

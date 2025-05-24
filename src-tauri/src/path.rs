extern crate execute;

use std::io::ErrorKind;
use std::process::Command;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::error::Error;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RootPathResponse {
    pub root_path: String,
    pub id: Option<u64>,
}

impl PartialEq for RootPathResponse {
    fn eq(&self, other: &Self) -> bool {
        self.root_path == other.root_path
    }
}

impl Eq for RootPathResponse {}

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
                Some(format!("Error parsing git command output to UTF-8: {}", e)),
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
fn calculate_hash<T: Hash + ?Sized>(t: &T) -> u64 {
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
                    .unwrap_or(raw_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            Some(format!(
                "The path **{}** does not contain a .git directory",
                raw_path.display()
            )),
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
                Some(format!("Error parsing git error output to UTF-8: {}", e)),
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
            Some(format!("Error parsing root path output to UTF-8: {}", e)),
        )
    })?;

    let response = RootPathResponse {
        root_path: rootpath.trim().to_string(),
        id: Some(calculate_hash(&rootpath.to_string())),
    };

    serde_json::to_string(&response).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the root path response to JSON: {}",
                e
            )),
        )
    })
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

    #[test]
    fn test_root_path_response_hash() {
        // Test the Hash implementation for RootPathResponse
        let resp1 = RootPathResponse {
            root_path: "/path/to/repo".to_string(),
            id: Some(12345),
        };

        let resp2 = RootPathResponse {
            root_path: "/path/to/repo".to_string(), // Same path
            id: Some(67890),                        // Different ID
        };

        let resp3 = RootPathResponse {
            root_path: "/different/path".to_string(), // Different path
            id: Some(12345),                          // Same ID
        };

        let resp4 = RootPathResponse {
            root_path: "/path/to/repo".to_string(), // Same as resp1
            id: Some(12345),                        // Same as resp1
        };

        // Create HashSets to verify Hash implementation
        use std::collections::HashSet;
        let mut set = HashSet::new();

        // Add responses to the set
        set.insert(resp1);
        set.insert(resp2);
        set.insert(resp3);

        // Since resp1 and resp2 have the same path, only one should be in the set
        // resp3 has a different path, so it should be in the set
        assert_eq!(set.len(), 2, "HashSet should contain only 2 items");

        // Verify resp4 (identical to resp1) is not added as a new item
        let was_new = set.insert(resp4);
        assert!(!was_new, "Identical item should not be added to HashSet");
        assert_eq!(set.len(), 2, "HashSet size should remain 2");
    }

    #[test]
    fn test_eq_implementation() {
        // Test the Eq implementation for RootPathResponse
        let resp1 = RootPathResponse {
            root_path: "/path/to/repo".to_string(),
            id: Some(12345),
        };

        let resp2 = RootPathResponse {
            root_path: "/path/to/repo".to_string(), // Same path
            id: Some(67890),                        // Different ID - should be ignored
        };

        let resp3 = RootPathResponse {
            root_path: "/different/path".to_string(), // Different path
            id: Some(12345),                          // Same ID - should be ignored
        };

        // Test equality based on path only
        assert_eq!(resp1, resp2, "Items with same path should be equal");
        assert_ne!(
            resp1, resp3,
            "Items with different paths should not be equal"
        );
    }

    #[tokio::test]
    async fn test_get_root_non_git_repository() {
        let _guard = DirectoryGuard::new();

        // Create a temporary directory that is not a git repository
        let non_git_repo = tempdir().unwrap();
        let non_git_path = non_git_repo.path().to_str().unwrap().to_string();

        // Test get_root with non-git repository
        let result = get_root(non_git_path).await;

        // Should return an error with specific kind
        assert!(result.is_err(), "Should error for non-git repository");
        if let Err(e) = result {
            assert_eq!(
                e.kind, "is_not_git_repository",
                "Wrong error kind for non-git repository"
            );
        }
    }

    #[test]
    fn test_calculate_hash_edge_cases() {
        // Test with empty string
        let empty_hash = calculate_hash(&"".to_string());
        assert!(empty_hash > 0, "Empty string should have a non-zero hash");

        // Test with very long string
        let long_string = "a".repeat(10000);
        let long_hash = calculate_hash(&long_string);
        assert!(long_hash > 0, "Long string should have a non-zero hash");

        // Test with special characters
        let special_chars = "!@#$%^&*()_+{}[]|\\:;\"'<>,.?/";
        let special_hash = calculate_hash(&special_chars.to_string());
        assert!(
            special_hash > 0,
            "String with special characters should have a non-zero hash"
        );
    }

    #[test]
    fn test_is_git_repository_non_git_dir() {
        let _guard = DirectoryGuard::new();

        // Create a temporary directory that is not a git repository
        let non_git_repo = tempdir().unwrap();
        let non_git_path = non_git_repo.path();

        // Test is_git_repository with non-git directory
        let result = is_git_repository(non_git_path);

        // Should return false for non-git directory
        assert_eq!(
            result.unwrap(),
            false,
            "is_git_repository should return false for non-git directory"
        );
    }

    #[test]
    fn test_is_git_repository_error_handling() {
        let _guard = DirectoryGuard::new();

        // Create a directory that cannot be accessed
        // Since we can't easily create an inaccessible directory in a portable way,
        // we'll mock the error condition by testing with a non-existent directory
        let non_existent_path = Path::new("/path/that/does/not/exist");
        let result = is_git_repository(non_existent_path);
        assert!(result.is_err(), "Expected error for non-existent directory");
        if let Err(e) = result {
            assert_eq!(e.kind, "unable_to_access_dir", "Wrong error kind");
        }

        // Create a directory with .git directory but not a complete git repo
        let incomplete_repo = tempdir().unwrap();
        let incomplete_path = incomplete_repo.path();

        // Create an empty .git directory
        std::fs::create_dir(incomplete_path.join(".git")).unwrap();

        // The repository exists but git commands might fail
        let result = is_git_repository(incomplete_path);

        // We might get an error or false, depending on how git behaves with the malformed repo
        if let Ok(is_git) = result {
            // If it returns Ok, it should be false
            assert!(
                !is_git,
                "Incomplete repo should not be recognized as git repo"
            );
        }
    }
}

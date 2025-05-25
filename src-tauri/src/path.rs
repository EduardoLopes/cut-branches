extern crate execute;

use git2::Repository;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;

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
    match Repository::open(path) {
        Ok(_) => Ok(true),
        Err(e) => {
            if e.code() == git2::ErrorCode::NotFound {
                Ok(false)
            } else {
                Err(Error::new(
                    format!("Failed to open git repository at {}: {}", path.display(), e),
                    "git_repository_error",
                    Some(e.to_string()),
                ))
            }
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

    let repo = Repository::open(raw_path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository: {}", e),
            "git_repository_error",
            Some(e.to_string()),
        )
    })?;

    let workdir = repo.workdir().ok_or_else(|| {
        Error::new(
            "Repository has no working directory".to_string(),
            "no_workdir",
            Some("The git repository is bare".to_string()),
        )
    })?;

    let rootpath = workdir.to_string_lossy().to_string();

    let response = RootPathResponse {
        root_path: rootpath.clone(),
        id: Some(calculate_hash(&rootpath)),
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

#[tauri::command]
pub fn get_git_root(path: String) -> Result<String, String> {
    let rootpath = Path::new(&path).to_path_buf();
    if !rootpath.exists() {
        return Err("Path does not exist".to_string());
    }

    // First try using git2
    if let Ok(repo) = Repository::discover(&rootpath) {
        if let Some(workdir) = repo.workdir() {
            return Ok(workdir.to_string_lossy().into_owned());
        }
    }

    // Fallback to command line git
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(&rootpath)
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(stdout.trim().to_string())
        }
        _ => Err("Not a git repository".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use git2::Repository;
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

        // Test with a path that does not exist
        let non_existent_path = Path::new("/path/that/does/not/exist/ever");
        let result = is_git_repository(non_existent_path);
        assert!(
            result.is_ok(),
            "Expected Ok for non-existent path, got {:?}",
            result
        );
        assert!(!result.unwrap(), "Expected false for non-existent path");
    }

    #[test]
    fn test_get_root_non_git_repository() {
        let _guard = DirectoryGuard::new();

        // Create a temporary directory that is not a git repository
        let non_git_repo = tempdir().unwrap();
        let non_git_path = non_git_repo.path();

        // Test get_root with non-git repository
        let result = tokio_test::block_on(get_root(non_git_path.to_str().unwrap().to_string()));

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
    fn test_get_root_with_invalid_repo() {
        let _guard = DirectoryGuard::new();

        // Create a directory with an invalid git repository
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path();

        // Create a .git directory with invalid content
        std::fs::create_dir(path.join(".git")).unwrap();
        std::fs::write(path.join(".git/config"), "invalid content").unwrap();
        std::fs::write(path.join(".git/HEAD"), "invalid content").unwrap();

        let path_str = path.to_str().unwrap().to_string();
        let result = tokio_test::block_on(get_root(path_str));
        assert!(result.is_err());
        if let Err(e) = result {
            assert_eq!(e.kind, "is_not_git_repository");
        }
    }

    #[test]
    fn test_get_root_with_bare_repo() {
        let _guard = DirectoryGuard::new();

        // Create a bare repository
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path();
        let _repo = Repository::init_bare(path).unwrap();

        let path_str = path.to_str().unwrap().to_string();
        let result = tokio_test::block_on(get_root(path_str));
        assert!(result.is_err());
        if let Err(e) = result {
            assert_eq!(e.kind, "no_workdir");
        }
    }

    #[test]
    fn test_get_root_success() {
        let _guard = DirectoryGuard::new();

        // Create a valid git repository
        let repo = setup_test_repo();
        let path = repo.path();

        let path_str = path.to_str().unwrap().to_string();
        let result = tokio_test::block_on(get_root(path_str));
        assert!(result.is_ok());

        if let Ok(json) = result {
            let response: RootPathResponse = serde_json::from_str(&json).unwrap();
            // Normalize paths for comparison
            let expected_path = PathBuf::from(path).canonicalize().unwrap();
            let actual_path = PathBuf::from(&response.root_path).canonicalize().unwrap();
            assert_eq!(actual_path, expected_path);
            assert!(response.id.is_some());
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
}

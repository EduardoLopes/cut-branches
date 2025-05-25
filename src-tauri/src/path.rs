extern crate execute;

use git2::Repository;
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
    match Repository::open(path) {
        Ok(repo) => {
            // Try to read the config to verify it's not corrupted
            match repo.config() {
                Ok(_) => {
                    // Try to read the HEAD to verify it's not corrupted
                    match repo.head() {
                        Ok(_) => Ok(true),
                        Err(e) => {
                            // If the repository is bare, it's still valid
                            if repo.is_bare() {
                                Ok(true)
                            } else {
                                Err(Error::new(
                                    format!(
                                        "Failed to read git repository HEAD at {}: {}",
                                        path.display(),
                                        e
                                    ),
                                    "git_repository_error",
                                    Some(e.to_string()),
                                ))
                            }
                        }
                    }
                }
                Err(e) => Err(Error::new(
                    format!(
                        "Failed to read git repository config at {}: {}",
                        path.display(),
                        e
                    ),
                    "git_repository_error",
                    Some(e.to_string()),
                )),
            }
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use git2::Repository;
    use std::path::PathBuf;
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

        // Test with a corrupted git repository
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path();
        let git_dir = path.join(".git");
        std::fs::create_dir(&git_dir).unwrap();

        // Create necessary directories first
        std::fs::create_dir(git_dir.join("objects")).unwrap();
        std::fs::create_dir(git_dir.join("refs")).unwrap();
        std::fs::create_dir(git_dir.join("refs/heads")).unwrap();

        // Create corrupted files
        std::fs::write(git_dir.join("config"), "invalid content").unwrap();
        std::fs::write(git_dir.join("HEAD"), "invalid ref").unwrap();
        std::fs::write(git_dir.join("objects/invalid"), "invalid content").unwrap();
        std::fs::write(git_dir.join("refs/heads/invalid"), "invalid ref").unwrap();
        std::fs::write(git_dir.join("index"), "invalid index").unwrap();

        let result = is_git_repository(path);
        assert!(
            result.is_err(),
            "Expected error for corrupted git repository"
        );
        if let Err(e) = result {
            assert_eq!(e.kind, "git_repository_error");
        }
    }

    #[test]
    fn test_get_root() {
        let _guard = DirectoryGuard::new();

        // Test with non-git repository
        let non_git_repo = tempdir().unwrap();
        let non_git_path = non_git_repo.path();
        let result = tokio_test::block_on(get_root(non_git_path.to_str().unwrap().to_string()));
        assert!(result.is_err(), "Should error for non-git repository");
        if let Err(e) = result {
            assert_eq!(
                e.kind, "is_not_git_repository",
                "Wrong error kind for non-git repository"
            );
        }

        // Test with bare repository
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path();
        let _repo = Repository::init_bare(path).unwrap();
        let path_str = path.to_str().unwrap().to_string();
        let result = tokio_test::block_on(get_root(path_str));
        assert!(result.is_err(), "Should error for bare repository");
        if let Err(e) = result {
            assert_eq!(e.kind, "no_workdir", "Wrong error kind for bare repository");
        }

        // Test with valid repository
        let repo = setup_test_repo();
        let path = repo.path();
        let path_str = path.to_str().unwrap().to_string();
        let result = tokio_test::block_on(get_root(path_str));
        assert!(result.is_ok(), "Should succeed for valid repository");

        if let Ok(json) = result {
            let response: RootPathResponse = serde_json::from_str(&json).unwrap();
            let expected_path = PathBuf::from(path).canonicalize().unwrap();
            let actual_path = PathBuf::from(&response.root_path).canonicalize().unwrap();
            assert_eq!(actual_path, expected_path, "Paths should match");
            assert!(response.id.is_some(), "ID should be present");
        }
    }

    #[test]
    fn test_root_path_response_implementations() {
        // Test Hash implementation
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

        // Test Hash implementation
        let mut set = std::collections::HashSet::new();
        set.insert(resp1.clone());
        set.insert(resp2.clone());
        set.insert(resp3.clone());
        assert_eq!(set.len(), 2, "HashSet should contain only 2 items");

        // Test Eq implementation
        assert_eq!(resp1, resp2, "Items with same path should be equal");
        assert_ne!(
            resp1, resp3,
            "Items with different paths should not be equal"
        );

        // Test Hash consistency with Eq
        assert_eq!(
            calculate_hash(&resp1),
            calculate_hash(&resp2),
            "Hash should be consistent with Eq"
        );
        assert_ne!(
            calculate_hash(&resp1),
            calculate_hash(&resp3),
            "Hash should be consistent with Eq"
        );
    }
}

use std::path::Path;

use crate::error::AppError;
use crate::git::GitDirResponse;
use crate::path::RootPathResponse;

/// Command to get information about a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repo_info(path: String) -> Result<String, AppError> {
    let raw_path = Path::new(&path);

    if !crate::path::is_git_repository(raw_path)? {
        return Err(AppError::new(
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

    let unserialized_root_path: String = crate::path::get_root(path.clone()).await?;

    let root_path = serde_json::from_str::<RootPathResponse>(&unserialized_root_path)
        .map_err(|e| {
            AppError::new(
                format!("Failed to parse root path response: {}", e),
                "parse_failed",
                Some(format!("Error parsing root path JSON: {}", e)),
            )
        })?
        .root_path;

    let raw_root_path = Path::new(&root_path);

    let mut branches = crate::git::get_all_branches_with_last_commit(raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current = crate::git::get_current_branch(raw_root_path)?;

    let repo_name = raw_root_path
        .file_name()
        .ok_or_else(|| {
            AppError::new(
                "Failed to get repository name".to_string(),
                "repo_name_failed",
                Some("Could not extract the repository name from the file path".to_string()),
            )
        })?
        .to_str()
        .ok_or_else(|| {
            AppError::new(
                "Failed to convert repository name to string".to_string(),
                "repo_name_failed",
                Some("Repository name contains invalid UTF-8 characters".to_string()),
            )
        })?
        .to_string();
    let branches_count = branches.len() as u32;

    let response = GitDirResponse {
        path: root_path,
        branches,
        current_branch: current.to_string(),
        branches_count,
        name: repo_name.clone(),
        id: repo_name,
    };

    serde_json::to_string(&response).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::fs;

    #[tokio::test]
    async fn test_get_repo_info() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .unwrap_or_else(|_| panic!("Failed to set current directory to {:?}", path));
        let path_str = path.to_str().unwrap().to_string();
        let result = get_repo_info(path_str).await;
        assert!(result.is_ok(), "get_repo_info failed: {:?}", result.err());
        let response_str = result.unwrap();
        let response: GitDirResponse = serde_json::from_str(&response_str).unwrap();
        assert_eq!(response.branches_count, 1, "Expected 1 branch");
        assert!(!response.branches.is_empty(), "No branches returned");
        assert!(!response.current_branch.is_empty(), "No current branch");
        assert!(
            response.branches[0].current,
            "First branch should be current"
        );
        let branch = &response.branches[0];
        assert!(!branch.name.is_empty(), "Branch has no name");
        assert!(!branch.last_commit.sha.is_empty(), "No commit SHA");
        assert!(!branch.last_commit.message.is_empty(), "No commit message");
        assert_eq!(
            branch.last_commit.message, "Initial commit",
            "Unexpected commit message"
        );
        assert_eq!(branch.last_commit.author, "Test User", "Unexpected author");
        let expected_email = "test@example.com";
        let mut actual_email = branch.last_commit.email.clone();
        if actual_email.starts_with('<') && actual_email.ends_with('>') {
            actual_email = actual_email
                .trim_start_matches('<')
                .trim_end_matches('>')
                .to_string();
        }
        assert_eq!(
            actual_email, expected_email,
            "Unexpected email. Expected: {}, Got: {}",
            expected_email, actual_email
        );
    }

    #[tokio::test]
    async fn test_get_repo_info_errors() {
        let _guard = DirectoryGuard::new();

        // Test with a non-git directory
        let temp_dir = tempfile::tempdir().unwrap();
        let path_str = temp_dir.path().to_str().unwrap().to_string();

        let result = get_repo_info(path_str).await;
        assert!(result.is_err(), "Expected error for non-git directory");
        if let Err(e) = result {
            assert_eq!(
                e.kind, "is_not_git_repository",
                "Wrong error kind for non-git directory: {}",
                e.kind
            );
        }

        // Test with invalid path
        let invalid_path = "/path/that/does/not/exist".to_string();
        let result = get_repo_info(invalid_path).await;
        assert!(result.is_err(), "Expected error for invalid path");

        // Test with a corrupted git repo (to trigger different error paths)
        let corrupt_repo_dir = tempfile::tempdir().unwrap();
        let corrupt_path = corrupt_repo_dir.path();

        // Create fake .git directory to pass the is_git_repository check but fail on actual git operations
        fs::create_dir(corrupt_path.join(".git")).unwrap();

        // Create a malformed git config
        let config_path = corrupt_path.join(".git/config");
        fs::write(config_path, "This is not a valid git config").unwrap();

        let corrupt_path_str = corrupt_path.to_str().unwrap().to_string();
        let result = get_repo_info(corrupt_path_str).await;
        assert!(result.is_err(), "Expected error for corrupted git repo");
    }

    #[tokio::test]
    async fn test_get_repo_info_parse_errors() {
        let _guard = DirectoryGuard::new();

        // Create a mock RootPathResponse with invalid JSON
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .unwrap_or_else(|_| panic!("Failed to set current directory to {:?}", path));
        // Create a corrupted git configuration to test parsing errors
        let test_dir = tempfile::tempdir().unwrap();
        let test_path = test_dir.path();
        fs::create_dir(test_path.join(".git")).unwrap();
        // Let it pass is_git_repository but fail at later steps

        let test_path_str = test_path.to_str().unwrap().to_string();
        let result = get_repo_info(test_path_str).await;
        assert!(result.is_err(), "Expected error for corrupted git repo");
    }
}

use std::path::Path;

use crate::shared::error::AppError;
use super::super::types::GitDirResponse;

/// Get information about a git repository.
///
/// # Arguments
///
/// * `raw_path` - Path to the git repository
/// * `path` - Original path string
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with repository information or an error
pub async fn get_repo_info(raw_path: &Path, path: &str) -> Result<String, AppError> {
    // Check if it's a git repository
    if !super::validation::is_git_repository(raw_path)? {
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

    // Get root path using path operations domain
    let unserialized_root_path: String = crate::domains::path_operations::service::get_root_path(path.to_string()).await?;
    
    // Parse root path response
    let root_path = serde_json::from_str::<crate::domains::path_operations::types::RootPathResponse>(&unserialized_root_path)
        .map_err(|e| {
            AppError::new(
                format!("Failed to parse root path response: {}", e),
                "parse_failed",
                Some(format!("Error parsing root path JSON: {}", e)),
            )
        })?
        .root_path;

    let raw_root_path = Path::new(&root_path);

    // Get branches from branch management domain (vertical slice architecture)
    let mut branches = crate::domains::branch_management::git::branch::get_all_branches_with_last_commit(raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current = crate::domains::branch_management::git::branch::get_current_branch(raw_root_path)?;

    // Extract repository name
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
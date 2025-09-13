use std::path::Path;

use crate::shared::error::AppError;
use crate::domains::branch_management::git::branch::Branch;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    #[serde(rename = "currentBranch")]
    pub current_branch: String,
    #[serde(rename = "branchesCount")]
    pub branches_count: u32,
    pub name: String,
    pub id: String,
}

/// Get information about a git repository.
///
/// # Arguments
///
/// * `raw_path` - Path to the git repository
/// * `path` - Original path string
///
/// # Returns
///
/// * `Result<GitDirResponse, AppError>` - Repository information or an error
pub async fn get_repo_info(raw_path: &Path, path: &str) -> Result<GitDirResponse, AppError> {
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
    let root_path_response = crate::domains::path_operations::service::get_root_path(path.to_string()).await?;
    let root_path = root_path_response.root_path;

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

    Ok(GitDirResponse {
        path: root_path,
        branches,
        current_branch: current.to_string(),
        branches_count,
        name: repo_name.clone(),
        id: repo_name,
    })
}
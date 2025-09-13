use std::path::Path;

use crate::shared::error::AppError;
use super::super::services::discovery::GitDirResponse;

/// Command to get information about a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
///
/// # Returns
///
/// * `Result<GitDirResponse, AppError>` - Repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repo_info(path: String) -> Result<GitDirResponse, AppError> {
    let raw_path = Path::new(&path);
    super::super::services::discovery::get_repo_info(raw_path, &path).await
}
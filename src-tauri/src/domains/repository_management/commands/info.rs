use std::path::Path;

use crate::shared::error::AppError;
// GitDirResponse is used by the service, not directly here

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
    super::super::services::discovery::get_repo_info(raw_path, &path).await
}
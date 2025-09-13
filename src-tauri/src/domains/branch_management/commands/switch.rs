use std::path::Path;

use crate::shared::error::AppError;

/// Command to switch to another branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch` - The branch name to switch to
///
/// # Returns
///
/// * `Result<String, AppError>` - The new current branch name or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn switch_branch(path: String, branch: String) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    super::super::services::switching::switch_branch(raw_path, &branch)
}
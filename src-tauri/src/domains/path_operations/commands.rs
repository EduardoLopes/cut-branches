use std::path::Path;

use crate::shared::error::AppError;
use super::service::RootPathResponse;

/// Gets the root path of a git repository.
///
/// # Arguments
///
/// * `path` - Path to check for a git repository
///
/// # Returns
///
/// * `Result<RootPathResponse, AppError>` - The root path and ID, or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_root(path: String) -> Result<RootPathResponse, AppError> {
    let _raw_path = Path::new(&path); // Unused for now, but kept for future validation
    super::service::get_root_path(path).await
}
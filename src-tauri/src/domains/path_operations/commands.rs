use std::path::Path;

use crate::shared::error::AppError;

/// Gets the root path of a git repository.
///
/// # Arguments
///
/// * `path` - Path to check for a git repository
///
/// # Returns
///
/// * `Result<String, AppError>` - JSON string with the root path and ID, or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_root(path: String) -> Result<String, AppError> {
    let _raw_path = Path::new(&path); // Unused for now, but kept for future validation
    super::service::get_root_path(path).await
}
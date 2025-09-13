use std::path::Path;

use crate::shared::error::AppError;
use super::super::types::deletion::RestoreBranchInput;

/// Command to restore a deleted branch in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `path` - Path to the git repository
/// * `branch_info` - Information about the branch to restore
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the restoration result or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branch(
    app: tauri::AppHandle,
    path: String,
    branch_info: RestoreBranchInput,
) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let result = super::super::services::restoration::restore_deleted_branch(raw_path, &branch_info, Some(&app))?;
    serde_json::to_string(&result).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the restoration result to JSON: {}",
                e
            )),
        )
    })
}

/// Command to restore multiple deleted branches in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `path` - Path to the git repository
/// * `branch_infos` - Information about the branches to restore
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the restoration results or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branches(
    app: tauri::AppHandle,
    path: String,
    branch_infos: Vec<RestoreBranchInput>,
) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let results = super::super::services::restoration::restore_deleted_branches(raw_path, &branch_infos, Some(&app))?;
    serde_json::to_string(&results).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the restoration results to JSON: {}",
                e
            )),
        )
    })
}
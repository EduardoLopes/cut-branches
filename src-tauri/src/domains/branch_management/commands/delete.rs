use std::path::Path;

use crate::shared::error::AppError;
use super::super::services::deletion::DeletedBranchInfo;

/// Command to delete branches from a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branches` - List of branch names to delete
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the deleted branches or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_branches(path: String, branches: Vec<String>) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let deleted_branch_infos: Vec<DeletedBranchInfo> =
        super::super::services::deletion::delete_branches(raw_path, &branches)?;

    serde_json::to_string(&deleted_branch_infos).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the deleted branches information to JSON: {}",
                e
            )),
        )
    })
}
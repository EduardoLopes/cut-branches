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
/// * `Result<Vec<DeletedBranchInfo>, AppError>` - The deleted branches or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_branches(path: String, branches: Vec<String>) -> Result<Vec<DeletedBranchInfo>, AppError> {
    let raw_path = Path::new(&path);
    let deleted_branch_infos: Vec<DeletedBranchInfo> =
        super::super::services::deletion::delete_branches(raw_path, &branches)?;

    Ok(deleted_branch_infos)
}
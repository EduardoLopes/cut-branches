use std::path::Path;

use crate::shared::error::AppError;
use super::super::services::deletion::{RestoreBranchInput, RestoreBranchResult};

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
/// * `Result<RestoreBranchResult, AppError>` - The restoration result or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branch(
    app: tauri::AppHandle,
    path: String,
    branch_info: RestoreBranchInput,
) -> Result<RestoreBranchResult, AppError> {
    let raw_path = Path::new(&path);
    let result = super::super::services::restoration::restore_deleted_branch(raw_path, &branch_info, Some(&app))?;
    Ok(result)
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
/// * `Result<Vec<RestoreBranchResult>, AppError>` - The restoration results or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branches(
    app: tauri::AppHandle,
    path: String,
    branch_infos: Vec<RestoreBranchInput>,
) -> Result<Vec<RestoreBranchResult>, AppError> {
    let raw_path = Path::new(&path);
    let results = super::super::services::restoration::restore_deleted_branches(raw_path, &branch_infos, Some(&app))?;
    Ok(results)
}
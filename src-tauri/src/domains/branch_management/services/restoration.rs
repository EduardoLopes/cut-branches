use std::path::Path;
use crate::shared::error::AppError;
use super::super::types::deletion::{RestoreBranchInput, RestoreBranchResult};

/// Restore a deleted branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch_info` - Information about the branch to restore
/// * `app` - Optional app handle for events
///
/// # Returns
///
/// * `Result<RestoreBranchResult, AppError>` - The restoration result or an error
pub fn restore_deleted_branch(
    path: &Path,
    branch_info: &RestoreBranchInput,
    app: Option<&tauri::AppHandle>,
) -> Result<RestoreBranchResult, AppError> {
    super::super::git::branch::restore_deleted_branch(path, branch_info, app)
}

/// Restore multiple deleted branches in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch_infos` - Information about the branches to restore
/// * `app` - Optional app handle for events
///
/// # Returns
///
/// * `Result<Vec<RestoreBranchResult>, AppError>` - The restoration results or an error
pub fn restore_deleted_branches(
    path: &Path,
    branch_infos: &[RestoreBranchInput],
    app: Option<&tauri::AppHandle>,
) -> Result<Vec<RestoreBranchResult>, AppError> {
    let results = super::super::git::branch::restore_deleted_branches(path, branch_infos, app)?;
    // Extract just the RestoreBranchResult from the (String, RestoreBranchResult) tuples
    Ok(results.into_iter().map(|(_, result)| result).collect())
}
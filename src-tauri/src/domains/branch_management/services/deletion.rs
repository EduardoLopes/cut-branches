use std::path::Path;
use crate::shared::error::AppError;
use super::super::types::deletion::DeletedBranchInfo;

/// Delete branches from a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branches` - List of branch names to delete
///
/// # Returns
///
/// * `Result<Vec<DeletedBranchInfo>, AppError>` - Information about deleted branches or an error
pub fn delete_branches(path: &Path, branches: &[String]) -> Result<Vec<DeletedBranchInfo>, AppError> {
    super::super::git::branch::delete_branches(path, branches)
}
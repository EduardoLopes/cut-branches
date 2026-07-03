use crate::shared::error::AppError;
use std::path::Path;

/// Switch to another branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch` - The branch name to switch to
///
/// # Returns
///
/// * `Result<String, AppError>` - The new current branch name or an error
pub fn switch_branch(path: &Path, branch: &str) -> Result<String, AppError> {
    crate::domains::branch_management::infrastructure::git::branch::switch_branch(path, branch)
}

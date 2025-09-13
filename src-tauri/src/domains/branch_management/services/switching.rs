use std::path::Path;
use crate::shared::error::AppError;

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
    super::super::git::branch::switch_branch(path, branch)
}
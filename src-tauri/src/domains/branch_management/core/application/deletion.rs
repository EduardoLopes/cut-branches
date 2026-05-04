use std::path::Path;

use crate::domains::branch_management::core::models::DeletedBranchInfo;
use crate::shared::error::AppError;

/// Delete branches from a git repository.
pub fn delete_branches(
    path: &Path,
    branches: &[String],
) -> Result<Vec<DeletedBranchInfo>, AppError> {
    super::super::super::git::branch::delete_branches(path, branches)
}

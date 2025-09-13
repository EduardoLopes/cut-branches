use super::super::git::branch::Branch;
use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, specta::Type, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedBranchInfo {
    pub branch: Branch,
    pub raw_output: String,
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub enum ConflictResolution {
    Overwrite,
    Rename,
    Skip,
}

#[derive(Serialize, Deserialize, specta::Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedBranch {
    pub original_name: String,
    pub target_name: String,
    pub commit_sha: String,
    pub conflict_resolution: Option<ConflictResolution>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchResult {
    pub success: bool,
    pub branch_name: String,
    pub message: String,
    pub requires_user_action: bool,
    pub conflict_details: Option<ConflictDetails>,
    pub skipped: bool,
    pub branch: Option<Branch>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ConflictDetails {
    pub original_name: String,
    pub conflicting_name: String,
}

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
pub fn delete_branches(
    path: &Path,
    branches: &[String],
) -> Result<Vec<DeletedBranchInfo>, AppError> {
    super::super::git::branch::delete_branches(path, branches)
}

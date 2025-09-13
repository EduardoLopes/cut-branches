use serde::{Deserialize, Serialize};
use super::branch::Branch;

#[derive(Serialize, Deserialize, specta::Type, Debug, Clone)]
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
pub struct RestoreBranchInput {
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
pub struct ConflictDetails {
    pub original_name: String,
    pub conflicting_name: String,
}
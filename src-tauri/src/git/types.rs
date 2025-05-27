use serde::{Deserialize, Serialize};

// Note: crate::error::Error will be needed by functions using these types,
// but the types themselves don't directly depend on it here.

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub short_sha: String,
    pub date: String,
    pub message: String,
    pub author: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Branch {
    pub name: String,
    #[serde(rename = "fullyMerged")]
    pub fully_merged: bool,
    #[serde(rename = "lastCommit")]
    pub last_commit: Commit,
    pub current: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    #[serde(rename = "currentBranch")]
    pub current_branch: String,
    #[serde(rename = "branchesCount")]
    pub branches_count: usize,
    pub name: String,
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeletedBranchInfo {
    pub branch: Branch,
    pub raw_output: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub enum ConflictResolution {
    Overwrite,
    Rename,
    Skip,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchInput {
    pub original_name: String,
    pub target_name: String,
    pub commit_sha: String,
    pub conflict_resolution: Option<ConflictResolution>,
}

#[derive(Serialize, Deserialize)]
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

#[derive(Serialize, Deserialize)]
pub struct ConflictDetails {
    pub original_name: String,
    pub conflicting_name: String,
}

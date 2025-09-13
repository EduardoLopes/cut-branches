use serde::{Deserialize, Serialize};
use crate::domains::branch_management::git::branch::Branch;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    #[serde(rename = "currentBranch")]
    pub current_branch: String,
    #[serde(rename = "branchesCount")]
    pub branches_count: u32,
    pub name: String,
    pub id: String,
}
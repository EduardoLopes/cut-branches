use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

use super::git::branch::Branch;
use super::services::deletion::DeletedBranchInfo;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BranchDeletedEvent {
    pub deleted_branches: Vec<DeletedBranchInfo>,
    pub repository_path: String,
}

impl Event for BranchDeletedEvent {
    const NAME: &'static str = "branch-deleted";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BranchRestoredEvent {
    pub restored_branch: Branch,
    pub repository_path: String,
}

impl Event for BranchRestoredEvent {
    const NAME: &'static str = "branch-restored";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BranchSwitchedEvent {
    pub from_branch: String,
    pub to_branch: String,
    pub repository_path: String,
}

impl Event for BranchSwitchedEvent {
    const NAME: &'static str = "branch-switched";
}
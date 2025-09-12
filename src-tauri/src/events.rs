use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

use crate::git::types::{Branch, DeletedBranchInfo};

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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RepositoryLoadedEvent {
    pub repository_path: String,
    pub repository_name: String,
    pub branches_count: u32,
}

impl Event for RepositoryLoadedEvent {
    const NAME: &'static str = "repository-loaded";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NotificationEvent {
    pub title: String,
    pub message: String,
    pub kind: NotificationKind,
    pub duration: Option<u32>,
}

impl Event for NotificationEvent {
    const NAME: &'static str = "notification";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum NotificationKind {
    Success,
    Error,
    Warning,
    Info,
}
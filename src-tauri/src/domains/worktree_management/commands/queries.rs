//! Delivery command: list a repository's worktrees.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::join_error;
use crate::domains::worktree_management::core::application::list;
use crate::domains::worktree_management::core::models::worktree::Worktree;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListWorktreesInput {
    /// Absolute path to the repository's working directory.
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListWorktreesOutput {
    pub worktrees: Vec<Worktree>,
}

/// Lists every worktree of the repository (the main worktree first, then each
/// linked worktree with its branch, HEAD, and lock status).
#[tauri::command(async)]
#[specta::specta]
pub async fn list_worktrees(input: ListWorktreesInput) -> Result<ListWorktreesOutput, AppError> {
    let path = input.path;
    let worktrees = tokio::task::spawn_blocking(move || list::list_worktrees(Path::new(&path)))
        .await
        .map_err(|e| join_error("worktree_list_failed", e))??;
    Ok(ListWorktreesOutput { worktrees })
}

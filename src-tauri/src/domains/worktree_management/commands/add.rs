//! Delivery command: add a worktree to a repository.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::join_error;
use crate::domains::worktree_management::core::application::add;
use crate::domains::worktree_management::core::models::worktree::Worktree;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AddWorktreeInput {
    /// Absolute path to the repository's working directory.
    pub path: String,
    /// Administrative name for the new worktree.
    pub name: String,
    /// Absolute path where the new worktree should be checked out. Must not exist yet.
    pub worktree_path: String,
    /// Local branch to check out. When omitted, git creates a new branch named `name`.
    pub reference: Option<String>,
    /// Lock the worktree immediately after creating it.
    pub lock: Option<bool>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AddWorktreeOutput {
    pub worktree: Worktree,
}

/// Creates a worktree and returns its resolved metadata.
#[tauri::command(async)]
#[specta::specta]
pub async fn add_worktree(input: AddWorktreeInput) -> Result<AddWorktreeOutput, AppError> {
    let worktree = tokio::task::spawn_blocking(move || {
        add::add_worktree(
            Path::new(&input.path),
            &input.name,
            Path::new(&input.worktree_path),
            input.reference.as_deref(),
            input.lock.unwrap_or(false),
        )
    })
    .await
    .map_err(|e| join_error("worktree_add_failed", e))??;
    Ok(AddWorktreeOutput { worktree })
}

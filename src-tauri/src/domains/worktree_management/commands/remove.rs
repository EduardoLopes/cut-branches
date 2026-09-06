//! Delivery command: remove a worktree from a repository.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::join_error;
use crate::domains::worktree_management::core::application::remove;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorktreeInput {
    /// Absolute path to the repository's working directory.
    pub path: String,
    /// Administrative name of the worktree to remove.
    pub name: String,
    /// Remove even if the worktree is locked.
    pub force: Option<bool>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorktreeOutput {
    /// Name of the worktree that was removed.
    pub name: String,
}

/// Removes the requested worktree (deleting its working tree and pruning its
/// admin files). The main worktree cannot be removed.
#[tauri::command(async)]
#[specta::specta]
pub async fn remove_worktree(input: RemoveWorktreeInput) -> Result<RemoveWorktreeOutput, AppError> {
    let name = input.name.clone();
    tokio::task::spawn_blocking(move || {
        remove::remove_worktree(
            Path::new(&input.path),
            &input.name,
            input.force.unwrap_or(false),
        )
    })
    .await
    .map_err(|e| join_error("worktree_remove_failed", e))??;
    Ok(RemoveWorktreeOutput { name })
}

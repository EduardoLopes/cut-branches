//! Delivery commands: lock and unlock a worktree.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::join_error;
use crate::domains::worktree_management::core::application::lock;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LockWorktreeInput {
    /// Absolute path to the repository's working directory.
    pub path: String,
    /// Administrative name of the worktree to lock.
    pub name: String,
    /// Optional reason recorded with the lock.
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LockWorktreeOutput {
    pub name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UnlockWorktreeInput {
    /// Absolute path to the repository's working directory.
    pub path: String,
    /// Administrative name of the worktree to unlock.
    pub name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UnlockWorktreeOutput {
    pub name: String,
}

/// Locks a worktree so it can't be pruned.
#[tauri::command(async)]
#[specta::specta]
pub async fn lock_worktree(input: LockWorktreeInput) -> Result<LockWorktreeOutput, AppError> {
    let name = input.name.clone();
    tokio::task::spawn_blocking(move || {
        lock::lock_worktree(Path::new(&input.path), &input.name, input.reason.as_deref())
    })
    .await
    .map_err(|e| join_error("worktree_lock_failed", e))??;
    Ok(LockWorktreeOutput { name })
}

/// Unlocks a previously locked worktree.
#[tauri::command(async)]
#[specta::specta]
pub async fn unlock_worktree(input: UnlockWorktreeInput) -> Result<UnlockWorktreeOutput, AppError> {
    let name = input.name.clone();
    tokio::task::spawn_blocking(move || lock::unlock_worktree(Path::new(&input.path), &input.name))
        .await
        .map_err(|e| join_error("worktree_unlock_failed", e))??;
    Ok(UnlockWorktreeOutput { name })
}

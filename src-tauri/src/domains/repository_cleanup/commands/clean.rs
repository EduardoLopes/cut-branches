//! Delivery command: delete the requested cleanable folders from a repository.
//! The destructive entry point. It re-validates every target server-side (§3);
//! the frontend confirmation is UX, this is the security boundary.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_specta::Event;

use crate::domains::repository_cleanup::core::application::clean;
use crate::domains::repository_cleanup::core::models::deletion_mode::DeletionMode;
use crate::domains::repository_cleanup::events::CleanupTargetCleanedEvent;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CleanRepositoryInput {
    /// Repository id (used for the audit log).
    pub repository_id: String,
    /// Absolute path to the repository's working directory.
    pub repository_path: String,
    /// Absolute paths of the folders to delete.
    pub targets: Vec<String>,
    /// Trash (recoverable) or permanent deletion.
    pub mode: DeletionMode,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TargetResult {
    pub path: String,
    pub ok: bool,
    pub bytes_freed: u64,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CleanRepositoryOutput {
    /// Total bytes freed across the successful targets.
    pub freed_bytes: u64,
    pub results: Vec<TargetResult>,
}

/// Deletes the requested folders after re-validating each against the
/// repository root and its `.gitignore` stack. A failure on one target is
/// reported per-target and does not abort the rest.
#[tauri::command(async)]
#[specta::specta]
pub async fn clean_repository(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    input: CleanRepositoryInput,
) -> Result<CleanRepositoryOutput, AppError> {
    let mut conn = db.connection()?;

    let repo_root = PathBuf::from(&input.repository_path);
    let repo_id = input.repository_id;
    let targets = input.targets;
    let mode = input.mode;

    let summary = tokio::task::spawn_blocking(move || {
        // Emit a per-folder event as each deletion succeeds, so the frontend can
        // drop it from cached scan results without waiting for a re-scan.
        let emit_id = repo_id.clone();
        clean::clean_repository(&repo_root, &targets, mode, &repo_id, &mut conn, |path, bytes| {
            let _ = CleanupTargetCleanedEvent {
                repository_id: emit_id.clone(),
                path: path.to_string(),
                bytes_freed: bytes,
            }
            .emit(&app);
        })
    })
    .await
    .map_err(|e| {
        AppError::new(
            "Cleanup failed".to_string(),
            "cleanup_failed",
            Some(e.to_string()),
        )
    })?;

    let results = summary
        .results
        .into_iter()
        .map(|o| TargetResult {
            path: o.path,
            ok: o.ok,
            bytes_freed: o.bytes_freed,
            error: o.error,
        })
        .collect();

    Ok(CleanRepositoryOutput {
        freed_bytes: summary.freed_bytes,
        results,
    })
}

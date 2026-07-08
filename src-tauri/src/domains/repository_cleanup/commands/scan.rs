//! Delivery command: measure the cleanable folders in one repository, so the
//! per-repo cleanup modal can preview exactly what would be deleted and how
//! much space it reclaims.

use std::path::PathBuf;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_specta::Event;

use crate::domains::repository_cleanup::core::application::scan;
use crate::domains::repository_cleanup::core::models::cleanup_target::CleanupTarget;
use crate::domains::repository_cleanup::events::CleanupScanProgressEvent;
use crate::shared::error::AppError;

const PROGRESS_THROTTLE: Duration = Duration::from_millis(80);

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScanCleanupTargetsInput {
    /// Absolute path to the repository's working directory.
    pub repository_path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScanCleanupTargetsOutput {
    pub targets: Vec<CleanupTarget>,
    /// Sum of all target sizes in bytes.
    pub total_bytes: u64,
}

/// Scans a single repository for cleanable folders and measures each one.
/// Sizing large trees can take a moment, so it runs on the blocking pool and
/// streams throttled `CleanupScanProgressEvent`s.
#[tauri::command(async)]
#[specta::specta]
pub async fn scan_cleanup_targets(
    app: AppHandle,
    input: ScanCleanupTargetsInput,
) -> Result<ScanCleanupTargetsOutput, AppError> {
    let repo_root = PathBuf::from(&input.repository_path);

    let targets = tokio::task::spawn_blocking(move || {
        let mut last_emit: Option<Instant> = None;
        scan::scan_cleanup_targets(&repo_root, |measured, path| {
            let due = match last_emit {
                Some(at) => at.elapsed() >= PROGRESS_THROTTLE,
                None => true,
            };
            if due {
                last_emit = Some(Instant::now());
                let _ = CleanupScanProgressEvent {
                    measured,
                    current_path: Some(path.to_string_lossy().into_owned()),
                }
                .emit(&app);
            }
        })
    })
    .await
    .map_err(|e| {
        AppError::new(
            "Cleanup scan failed".to_string(),
            "cleanup_scan_failed",
            Some(e.to_string()),
        )
    })?;

    let total_bytes = targets.iter().map(|t| t.size_bytes).sum();
    Ok(ScanCleanupTargetsOutput {
        targets,
        total_bytes,
    })
}

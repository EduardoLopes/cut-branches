//! Progress events streamed to the frontend during the (potentially slow)
//! filesystem walks, so the UI can show live progress. Throttled by the
//! commands that emit them, mirroring `RepositoryScanProgressEvent`.

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

/// Emitted while `scan_cleanup_targets` measures a repository's cleanable
/// folders (one repo, per-target sizing).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CleanupScanProgressEvent {
    /// Number of targets measured so far.
    pub measured: u32,
    /// Path currently being measured.
    pub current_path: Option<String>,
}

impl Event for CleanupScanProgressEvent {
    const NAME: &'static str = "cleanup-scan-progress";
}

/// Emitted while `list_stale_repositories` walks the registered repositories.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StaleScanProgressEvent {
    /// Repositories examined so far.
    pub scanned: u32,
    /// Total repositories to examine.
    pub total: u32,
    /// Stale repositories with reclaimable space found so far.
    pub found: u32,
    /// Name of the repository currently being examined.
    pub current_name: Option<String>,
}

impl Event for StaleScanProgressEvent {
    const NAME: &'static str = "stale-scan-progress";
}

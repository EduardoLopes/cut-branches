//! Use-case: delete the requested targets from a repository (§1.2). This is the
//! destructive core. Every target is re-validated here regardless of what the
//! caller sent — the frontend's confirmation dialogs are UX, this is the
//! security boundary. A failure on one target is reported per-target and does
//! not abort the rest.

use std::collections::HashSet;
use std::path::Path;

use crate::domains::repository_cleanup::core::models::deletion_mode::DeletionMode;
use crate::domains::repository_cleanup::infrastructure::{deleter, history, sizing, validator};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::models::NewCleanupHistory;
use crate::shared::infrastructure::db::DbConnection;

/// Outcome of attempting to delete one target.
pub struct TargetOutcome {
    pub path: String,
    pub ok: bool,
    pub bytes_freed: u64,
    pub error: Option<String>,
}

/// Aggregate result of a cleanup run.
pub struct CleanSummary {
    pub freed_bytes: u64,
    pub results: Vec<TargetOutcome>,
}

/// Validate and delete each of `targets` under `repo_root`. `allowed` is the set
/// of folder names permitted for this repo (the configured allowlist unioned
/// with any `.gitignore` picks the user explicitly approved). Successful
/// deletions are recorded in the audit log (best-effort).
pub fn clean_repository(
    repo_root: &Path,
    targets: &[String],
    allowed: &HashSet<String>,
    mode: DeletionMode,
    repo_id: &str,
    conn: &mut DbConnection,
) -> CleanSummary {
    let mut results = Vec::with_capacity(targets.len());
    let mut freed_bytes = 0u64;

    for target_str in targets {
        let target = Path::new(target_str);
        let outcome = match validator::resolve_clean_target(repo_root, target, allowed) {
            Ok(clean_target) => {
                // Measure before deleting so we can report freed space.
                let size = sizing::dir_size_bytes(clean_target.path());
                match deleter::delete_target(&clean_target, mode) {
                    Ok(()) => {
                        freed_bytes += size;
                        let folder_name = clean_target
                            .path()
                            .file_name()
                            .map(|n| n.to_string_lossy().into_owned())
                            .unwrap_or_default();
                        let _ = history::record_cleanup(
                            conn,
                            NewCleanupHistory {
                                repository_id: repo_id.to_string(),
                                target_path: target_str.clone(),
                                folder_name,
                                bytes_freed: size as i64,
                                deletion_mode: mode.as_str().to_string(),
                            },
                        );
                        TargetOutcome {
                            path: target_str.clone(),
                            ok: true,
                            bytes_freed: size,
                            error: None,
                        }
                    }
                    Err(err) => TargetOutcome {
                        path: target_str.clone(),
                        ok: false,
                        bytes_freed: 0,
                        error: Some(AppError::from(err).message),
                    },
                }
            }
            Err(err) => TargetOutcome {
                path: target_str.clone(),
                ok: false,
                bytes_freed: 0,
                error: Some(AppError::from(err).message),
            },
        };
        results.push(outcome);
    }

    CleanSummary {
        freed_bytes,
        results,
    }
}

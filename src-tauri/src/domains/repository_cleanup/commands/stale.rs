//! Delivery command: list registered repositories that are stale and have
//! reclaimable space, powering the bulk cleanup page.

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_specta::Event;

use crate::domains::repository_cleanup::core::application::stale;
use crate::domains::repository_cleanup::core::models::cleanup_target::CleanupTarget;
use crate::domains::repository_cleanup::core::ports::CleanupServices;
use crate::domains::repository_cleanup::events::StaleScanProgressEvent;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;

const PROGRESS_THROTTLE: Duration = Duration::from_millis(80);

/// Default staleness threshold when the caller passes none.
const DEFAULT_THRESHOLD_DAYS: u32 = 90;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListStaleRepositoriesInput {
    /// A repository is stale when its most recent activity is older than this.
    #[serde(default)]
    pub threshold_days: Option<u32>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct StaleRepository {
    pub id: String,
    pub name: String,
    pub path: String,
    /// Unix seconds of the repository's most recent activity.
    pub stale_since: i64,
    pub reclaimable_bytes: u64,
    pub targets: Vec<CleanupTarget>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListStaleRepositoriesOutput {
    pub repositories: Vec<StaleRepository>,
    /// Total reclaimable bytes across all stale repositories.
    pub total_reclaimable_bytes: u64,
}

/// Lists stale registered repositories with their reclaimable `.gitignore`d
/// folders. The DB read is quick and done up front; the per-repo filesystem
/// walk runs on the blocking pool with throttled progress events.
#[tauri::command(async)]
#[specta::specta]
pub async fn list_stale_repositories(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    services: State<'_, CleanupServices>,
    input: ListStaleRepositoriesInput,
) -> Result<ListStaleRepositoriesOutput, AppError> {
    let repos = {
        let mut conn = db.connection()?;
        services.catalog.list_registered(&mut conn)?
    };

    let threshold_days = input.threshold_days.unwrap_or(DEFAULT_THRESHOLD_DAYS);
    let now_secs = chrono::Utc::now().timestamp();

    let stale_repos = tokio::task::spawn_blocking(move || {
        let mut last_emit: Option<Instant> = None;
        stale::list_stale_repositories(
            &repos,
            threshold_days,
            now_secs,
            |scanned, total, found, name| {
                let due = match last_emit {
                    Some(at) => at.elapsed() >= PROGRESS_THROTTLE,
                    None => true,
                };
                if due {
                    last_emit = Some(Instant::now());
                    let _ = StaleScanProgressEvent {
                        scanned,
                        total,
                        found,
                        current_name: Some(name.to_string()),
                    }
                    .emit(&app);
                }
            },
        )
    })
    .await
    .map_err(|e| {
        AppError::new(
            "Stale-repository scan failed".to_string(),
            "stale_scan_failed",
            Some(e.to_string()),
        )
    })?;

    let repositories: Vec<StaleRepository> = stale_repos
        .into_iter()
        .map(|r| StaleRepository {
            id: r.id,
            name: r.name,
            path: r.path,
            stale_since: r.stale_since,
            reclaimable_bytes: r.reclaimable_bytes,
            targets: r.targets,
        })
        .collect();

    let total_reclaimable_bytes = repositories.iter().map(|r| r.reclaimable_bytes).sum();
    Ok(ListStaleRepositoriesOutput {
        repositories,
        total_reclaimable_bytes,
    })
}

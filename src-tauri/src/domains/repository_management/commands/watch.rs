use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_specta::Event;

use notify::RecursiveMode;
use notify_debouncer_full::DebouncedEvent;

use crate::domains::repository_management::core::application::discovery;
use crate::domains::repository_management::core::ports::RepositoryServices;
use crate::domains::repository_management::error::RepositoryError;
use crate::domains::repository_management::events::RepositoryChangedEvent;
use crate::domains::repository_management::infrastructure::repositories as operations;
use crate::domains::repository_management::infrastructure::state_hash::compute_repo_state_timestamp;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;
use crate::shared::infrastructure::watcher::{WatchCallback, WatcherState};

/// How long to coalesce a burst of ref writes before reacting. A rebase or a
/// fetch can touch many refs in quick succession; this collapses them into one
/// re-sync per affected repository.
pub const WATCH_DEBOUNCE: Duration = Duration::from_millis(400);

/// Canonical `.git` directory of a repository, used both for watching and for
/// matching filesystem events back to a repo. Canonicalizing keeps macOS
/// FSEvents (which reports `/private/var/…`) matching a workdir stored as
/// `/var/…`.
fn canonical_git_dir(repo_root: &str) -> PathBuf {
    let git_dir = Path::new(repo_root).join(".git");
    std::fs::canonicalize(&git_dir).unwrap_or(git_dir)
}

/// Register a repository's git ref surface with the shared watcher.
pub fn watch_repository(watcher: &WatcherState, repo_root: &str) {
    let git_dir = canonical_git_dir(repo_root);
    // HEAD and packed-refs live directly in .git; branch refs (incl. namespaced
    // feature/* dirs) live under refs/heads.
    let _ = watcher.watch_path(&git_dir, RecursiveMode::NonRecursive);
    let _ = watcher.watch_path(
        &git_dir.join("refs").join("heads"),
        RecursiveMode::Recursive,
    );
}

/// Remove a repository's git ref surface from the shared watcher.
pub fn unwatch_repository(watcher: &WatcherState, repo_root: &str) {
    let git_dir = canonical_git_dir(repo_root);
    watcher.unwatch_path(&git_dir.join("refs").join("heads"));
    watcher.unwatch_path(&git_dir);
}

/// Watch every repository currently registered in the database. Called once at
/// startup after the watcher is initialized.
pub fn register_all_repositories(app: &AppHandle) {
    let db = app.state::<DatabaseState>();
    let watcher = app.state::<WatcherState>();
    let mut conn = match db.connection() {
        Ok(c) => c,
        Err(e) => {
            log::error!("[watcher] register_all: db connection failed: {e}");
            return;
        }
    };
    match operations::get_repository_list(&mut conn) {
        Ok(repos) => {
            for repo in repos {
                watch_repository(&watcher, &repo.path);
            }
        }
        Err(e) => log::error!("[watcher] register_all: failed to list repositories: {e}"),
    }
}

/// True if `path` is a branch ref (`refs/heads/**`), `HEAD`, or `packed-refs` —
/// the surface that affects branch listing.
fn is_ref_path(path: &Path) -> bool {
    let name = path.file_name().and_then(|n| n.to_str());
    if matches!(name, Some("HEAD") | Some("packed-refs")) {
        return true;
    }
    let s = path.to_string_lossy();
    s.contains("refs/heads") || s.contains("refs\\heads")
}

/// Build the reaction callback for the shared watcher. On each debounced batch
/// it maps changed paths back to repositories (via the DB, the source of truth
/// for repo paths), re-syncs each affected repo once, and emits a
/// [`RepositoryChangedEvent`] so the UI can refresh — including the sidebar
/// branch counts for repositories that aren't currently open.
///
/// Captures an owned `AppHandle` (a cheap `Arc` clone) — never a `State<'_>`,
/// whose lifetime isn't `'static`.
pub fn build_watch_callback(app: AppHandle) -> WatchCallback {
    Box::new(move |events: Vec<DebouncedEvent>| {
        let changed: Vec<PathBuf> = events
            .iter()
            .flat_map(|e| e.paths.clone())
            .filter(|p| is_ref_path(p))
            .collect();
        if changed.is_empty() {
            return;
        }

        let db = app.state::<DatabaseState>();
        let services = app.state::<RepositoryServices>();
        let mut conn = match db.connection() {
            Ok(c) => c,
            Err(e) => {
                log::error!("[watcher] db connection failed: {e}");
                return;
            }
        };
        let repos = match operations::get_repository_list(&mut conn) {
            Ok(r) => r,
            Err(e) => {
                log::error!("[watcher] failed to list repositories: {e}");
                return;
            }
        };

        // Resolve each changed path to its repository and re-sync each affected
        // repo at most once per batch.
        let mut synced: HashSet<String> = HashSet::new();
        for path in &changed {
            let Some(repo) = repos.iter().find(|r| {
                let git_dir = canonical_git_dir(&r.path);
                path.starts_with(&git_dir)
            }) else {
                continue;
            };
            if !synced.insert(repo.id.clone()) {
                continue;
            }
            if !Path::new(&repo.path).join(".git").exists() {
                log::warn!("[watcher] {} .git disappeared; skipping sync", repo.id);
                continue;
            }
            if let Err(e) = discovery::resync_repository(
                Path::new(&repo.path),
                &repo.id,
                &mut conn,
                services.branch.as_ref(),
            ) {
                log::error!("[watcher] resync failed for {}: {e}", repo.id);
                continue;
            }
            let _ = RepositoryChangedEvent {
                repository_id: repo.id.clone(),
            }
            .emit(&app);
        }
    })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositorySyncStatusInput {
    pub repository_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositorySyncStatusOutput {
    /// True when git's on-disk state no longer matches the last synced
    /// fingerprint — i.e. the DB projection has drifted (a change the watcher
    /// may have missed, e.g. while the app was backgrounded).
    pub drifted: bool,
}

/// Cheap read-only check comparing git's current ref fingerprint against the
/// stored `last_sync_timestamp`. The frontend calls this on window focus for the
/// active repo to detect changes the watcher missed and heal silently.
#[tauri::command]
#[specta::specta]
pub fn get_repository_sync_status(
    db: State<'_, DatabaseState>,
    input: GetRepositorySyncStatusInput,
) -> Result<GetRepositorySyncStatusOutput, AppError> {
    let mut conn = db.connection()?;
    let repo = operations::get_repository(&mut conn, &input.repository_id).map_err(|_| {
        RepositoryError::NotFound {
            id: input.repository_id.clone(),
        }
    })?;

    let repo_root = Path::new(&repo.path);
    // If the repo isn't on disk anymore, treat it as not drifted — deletion is
    // handled by its own flow, not by surfacing a refresh button.
    if !repo_root.join(".git").exists() {
        return Ok(GetRepositorySyncStatusOutput { drifted: false });
    }

    let current = compute_repo_state_timestamp(repo_root)?;
    let drifted = match repo.last_sync_timestamp {
        Some(stored) => stored != current,
        None => true,
    };

    Ok(GetRepositorySyncStatusOutput { drifted })
}

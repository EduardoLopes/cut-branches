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
use crate::domains::repository_management::infrastructure::state_hash::{
    self, compute_repo_state_timestamp,
};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;
use crate::shared::infrastructure::watcher::{WatchCallback, WatcherState};

/// How long to coalesce a burst of ref writes before reacting. A rebase or a
/// fetch can touch many refs in quick succession; this collapses them into one
/// re-sync per affected repository.
pub const WATCH_DEBOUNCE: Duration = Duration::from_millis(400);

/// The canonical git directories a repository's ref surface lives in.
///
/// Resolved through git2 (never assumed to be `<root>/.git`) so a **linked
/// worktree** — whose `.git` is a pointer *file* — is watched at the real
/// directories: its private git dir for `HEAD`, and the main repository's git
/// dir for the shared `refs/heads/**` and `packed-refs`.
///
/// Canonicalizing keeps macOS FSEvents (which reports `/private/var/…`)
/// matching a workdir stored as `/var/…`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct RepoWatchPaths {
    /// Worktree-private git dir (owns `HEAD`).
    pub git_dir: PathBuf,
    /// Shared git dir (owns `refs/heads/**` and `packed-refs`).
    pub common_dir: PathBuf,
}

impl RepoWatchPaths {
    /// True when this repository is a linked worktree (its private git dir is
    /// not the shared one).
    fn is_linked_worktree(&self) -> bool {
        self.git_dir != self.common_dir
    }

    /// True when `path` belongs to this repository's watched ref surface.
    fn contains(&self, path: &Path) -> bool {
        path.starts_with(&self.git_dir) || path.starts_with(&self.common_dir)
    }
}

fn canonicalize(path: PathBuf) -> PathBuf {
    std::fs::canonicalize(&path).unwrap_or(path)
}

/// Resolves the git directories to watch for `repo_root`, falling back to the
/// plain `<root>/.git` guess when the repository can't be opened (e.g. it was
/// deleted from disk while still registered).
pub(crate) fn repo_watch_paths(repo_root: &str) -> RepoWatchPaths {
    match state_hash::resolve_git_dirs(Path::new(repo_root)) {
        Ok(dirs) => RepoWatchPaths {
            git_dir: canonicalize(dirs.git_dir),
            common_dir: canonicalize(dirs.common_dir),
        },
        Err(_) => {
            let fallback = canonicalize(Path::new(repo_root).join(".git"));
            RepoWatchPaths {
                git_dir: fallback.clone(),
                common_dir: fallback,
            }
        }
    }
}

/// Register a repository's git ref surface with the shared watcher.
pub fn watch_repository(watcher: &WatcherState, repo_root: &str) {
    let paths = repo_watch_paths(repo_root);
    // HEAD lives directly in the worktree-private git dir; branch refs (incl.
    // namespaced feature/* dirs) and packed-refs live in the shared one.
    let _ = watcher.watch_path(&paths.git_dir, RecursiveMode::NonRecursive);
    if paths.is_linked_worktree() {
        let _ = watcher.watch_path(&paths.common_dir, RecursiveMode::NonRecursive);
    }
    let _ = watcher.watch_path(
        &paths.common_dir.join("refs").join("heads"),
        RecursiveMode::Recursive,
    );
}

/// Remove a repository's git ref surface from the shared watcher.
///
/// For a linked worktree only the private git dir is unwatched: the shared
/// directories may still be serving the main repository (or a sibling
/// worktree), and the watcher has no refcounting. A leftover watch is harmless
/// — the callback only reacts to paths that map to a *registered* repository.
pub fn unwatch_repository(watcher: &WatcherState, repo_root: &str) {
    let paths = repo_watch_paths(repo_root);
    if !paths.is_linked_worktree() {
        watcher.unwatch_path(&paths.common_dir.join("refs").join("heads"));
    }
    watcher.unwatch_path(&paths.git_dir);
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
        // A shared git dir can back several registered repositories (a main
        // repo and its linked worktrees), so every match is re-synced — not
        // just the first one found.
        let watch_paths: Vec<(usize, RepoWatchPaths)> = repos
            .iter()
            .enumerate()
            .map(|(i, r)| (i, repo_watch_paths(&r.path)))
            .collect();
        let mut synced: HashSet<String> = HashSet::new();
        for path in &changed {
            for (index, _) in watch_paths.iter().filter(|(_, p)| p.contains(path)) {
                let repo = &repos[*index];
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{run_git, setup_test_repo, DirectoryGuard};

    /// A linked worktree must be watched at the *real* git directories: its
    /// private dir for HEAD and the main repository's dir for the shared refs.
    /// Watching `<root>/.git` (a pointer *file* here) watched nothing useful.
    #[test]
    fn watch_paths_of_a_linked_worktree_point_into_the_main_git_dir() {
        let _guard = DirectoryGuard::new();
        let main = setup_test_repo();
        let holder = tempfile::tempdir().unwrap();
        let worktree = holder.path().join("wt");
        run_git(
            main.path(),
            &[
                "worktree",
                "add",
                worktree.to_str().unwrap(),
                "-b",
                "wt-watch",
            ],
        );

        let main_git_dir = std::fs::canonicalize(main.path().join(".git")).unwrap();
        let paths = repo_watch_paths(worktree.to_str().unwrap());

        assert!(paths.is_linked_worktree());
        assert_eq!(paths.common_dir, main_git_dir);
        assert!(paths.git_dir.starts_with(&main_git_dir));
        assert!(paths.git_dir.join("HEAD").is_file());
        assert!(paths.common_dir.join("refs").join("heads").is_dir());

        // Events on either directory belong to this repository.
        assert!(paths.contains(&paths.git_dir.join("HEAD")));
        assert!(paths.contains(&main_git_dir.join("refs").join("heads").join("wt-watch")));
        assert!(!paths.contains(Path::new("/definitely/not/this/repo")));
    }

    /// An ordinary repository resolves to a single `.git` directory.
    #[test]
    fn watch_paths_of_a_plain_repository_collapse_to_one_git_dir() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let paths = repo_watch_paths(repo.path().to_str().unwrap());

        assert!(!paths.is_linked_worktree());
        assert_eq!(
            paths.git_dir,
            std::fs::canonicalize(repo.path().join(".git")).unwrap()
        );
    }

    /// A registered repository that no longer exists on disk can't be opened;
    /// the paths fall back to the plain `<root>/.git` guess.
    #[test]
    fn watch_paths_fall_back_when_the_repository_cannot_be_opened() {
        let _guard = DirectoryGuard::new();
        let temp = tempfile::tempdir().unwrap();
        let missing = temp.path().join("gone");
        let paths = repo_watch_paths(missing.to_str().unwrap());

        assert_eq!(paths.git_dir, missing.join(".git"));
        assert_eq!(paths.common_dir, paths.git_dir);
        assert!(!paths.is_linked_worktree());
    }

    #[test]
    fn is_ref_path_matches_the_branch_surface() {
        assert!(is_ref_path(Path::new("/repo/.git/HEAD")));
        assert!(is_ref_path(Path::new("/repo/.git/packed-refs")));
        assert!(is_ref_path(Path::new("/repo/.git/refs/heads/feature/x")));
        assert!(!is_ref_path(Path::new("/repo/.git/index")));
    }
}

//! Generic filesystem-watcher engine (§2 shared infrastructure).
//!
//! Domain-agnostic: it holds a single debouncer and lets callers add/remove
//! watched paths and receive coalesced change batches through an injected
//! callback. It must not reference any domain — the *reaction* to a change
//! (mapping a path back to a repository, re-syncing, emitting an event) is wired
//! up by the `repository_management` delivery layer, which owns that concern.
//!
//! Backed by `notify` + `notify-debouncer-full`. A **single** watcher/debouncer
//! (one background thread) watches every registered path, so watching N repos
//! costs one thread regardless of N. A burst of ref writes (e.g. a rebase
//! touching dozens of refs) coalesces into a single deduplicated batch per
//! debounce window, delivered serially — so two reactions can never overlap.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{
    new_debouncer, DebounceEventResult, DebouncedEvent, Debouncer, FileIdMap,
};

use crate::shared::error::AppError;

/// Callback invoked with the coalesced batch after each debounce window.
/// Boxed + `Send` + `'static` so it can move onto the debouncer's thread.
pub type WatchCallback = Box<dyn Fn(Vec<DebouncedEvent>) + Send + 'static>;

/// Tauri-managed state holding the single shared watcher.
///
/// `Mutex` makes this `Sync + 'static` so it can be handed to `.manage(...)`;
/// no inner `Arc` is needed because Tauri already shares managed state behind
/// its own `Arc`.
///
/// Watched paths are **refcounted**: several callers can legitimately depend on
/// the same directory (a git repository and each of its linked worktrees all
/// need the shared `refs/heads`), so a path is only really unwatched once the
/// last caller has released it. Without that, unregistering one caller silently
/// deafened every other caller sharing the directory.
pub struct WatcherState {
    inner: Mutex<Option<Debouncer<RecommendedWatcher, FileIdMap>>>,
    /// How many outstanding `watch_path` registrations each watched path holds.
    roots: Mutex<HashMap<PathBuf, usize>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
            roots: Mutex::new(HashMap::new()),
        }
    }

    /// Build the single debouncer with the given reaction callback. Replaces any
    /// existing watcher (dropping it stops its thread). Call once at startup.
    pub fn init(&self, debounce: Duration, on_event: WatchCallback) -> Result<(), AppError> {
        let debouncer = new_debouncer(
            debounce,
            None, // default tick rate
            move |res: DebounceEventResult| match res {
                Ok(events) => on_event(events),
                // Never crash the watcher thread — log and keep going.
                Err(errors) => {
                    for e in errors {
                        log::error!("[watcher] notify error: {e:?}");
                    }
                }
            },
        )
        .map_err(|e| {
            AppError::new(
                "Failed to create filesystem watcher".to_string(),
                "watcher_init_failed",
                Some(e.to_string()),
            )
        })?;

        *self.inner.lock().unwrap() = Some(debouncer);
        Ok(())
    }

    /// Take a reference on `path`, starting the underlying watch on the first
    /// one. No-op if the path doesn't exist (a repo may lack `packed-refs`, for
    /// instance) or if the watcher hasn't been initialized.
    pub fn watch_path(&self, path: &Path, mode: RecursiveMode) -> Result<(), AppError> {
        if !path.exists() {
            return Ok(());
        }
        let mut guard = self.inner.lock().unwrap();
        let Some(debouncer) = guard.as_mut() else {
            return Ok(());
        };
        let mut roots = self.roots.lock().unwrap();
        if let Some(count) = roots.get_mut(path) {
            // Already watched on behalf of another caller.
            *count += 1;
            return Ok(());
        }
        debouncer.watcher().watch(path, mode).map_err(|e| {
            AppError::new(
                format!("Failed to watch {}", path.display()),
                "watcher_watch_failed",
                Some(e.to_string()),
            )
        })?;
        // Track file identity under this root so the debouncer can dedupe.
        debouncer.cache().add_root(path, mode);
        roots.insert(path.to_path_buf(), 1);
        Ok(())
    }

    /// Release one reference on `path`, really unwatching it only once the last
    /// caller lets go. Best-effort: ignores paths that aren't watched.
    pub fn unwatch_path(&self, path: &Path) {
        let mut guard = self.inner.lock().unwrap();
        let Some(debouncer) = guard.as_mut() else {
            return;
        };
        let mut roots = self.roots.lock().unwrap();
        match roots.get_mut(path) {
            // Still needed by another caller.
            Some(count) if *count > 1 => *count -= 1,
            Some(_) => {
                roots.remove(path);
                let _ = debouncer.watcher().unwatch(path);
                debouncer.cache().remove_root(path);
            }
            None => {}
        }
    }

    /// Number of outstanding registrations on `path` (0 when not watched).
    #[cfg(test)]
    pub(crate) fn watch_count(&self, path: &Path) -> usize {
        self.roots.lock().unwrap().get(path).copied().unwrap_or(0)
    }

    /// Drop the watcher entirely (stops its thread). Called on app exit.
    pub fn shutdown(&self) {
        *self.inner.lock().unwrap() = None;
        self.roots.lock().unwrap().clear();
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn initialized() -> WatcherState {
        let state = WatcherState::new();
        state
            .init(Duration::from_millis(10), Box::new(|_| {}))
            .unwrap();
        state
    }

    /// Two callers sharing a directory must both keep it alive: the first
    /// release only decrements, the last one really unwatches.
    #[test]
    fn watched_paths_are_refcounted() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path();
        let state = initialized();

        state.watch_path(path, RecursiveMode::NonRecursive).unwrap();
        assert_eq!(state.watch_count(path), 1);
        state.watch_path(path, RecursiveMode::NonRecursive).unwrap();
        assert_eq!(state.watch_count(path), 2);

        state.unwatch_path(path);
        assert_eq!(state.watch_count(path), 1);
        state.unwatch_path(path);
        assert_eq!(state.watch_count(path), 0);

        // Releasing a path nobody holds is a harmless no-op.
        state.unwatch_path(path);
        assert_eq!(state.watch_count(path), 0);
    }

    /// Nothing is counted for a path that isn't there (a repo without
    /// `packed-refs`) or while the watcher hasn't been initialized.
    #[test]
    fn watch_path_ignores_missing_paths_and_an_uninitialized_watcher() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("nope");

        let state = initialized();
        state
            .watch_path(&missing, RecursiveMode::NonRecursive)
            .unwrap();
        assert_eq!(state.watch_count(&missing), 0);

        let uninitialized = WatcherState::default();
        uninitialized
            .watch_path(dir.path(), RecursiveMode::NonRecursive)
            .unwrap();
        assert_eq!(uninitialized.watch_count(dir.path()), 0);
        // Releasing against an uninitialized watcher is a no-op too.
        uninitialized.unwatch_path(dir.path());
        assert_eq!(uninitialized.watch_count(dir.path()), 0);
    }

    /// Shutting down drops the watcher *and* every outstanding registration, so
    /// a re-init starts from a clean slate.
    #[test]
    fn shutdown_clears_the_watched_paths() {
        let dir = tempfile::tempdir().unwrap();
        let state = initialized();
        state
            .watch_path(dir.path(), RecursiveMode::Recursive)
            .unwrap();
        assert_eq!(state.watch_count(dir.path()), 1);

        state.shutdown();
        assert_eq!(state.watch_count(dir.path()), 0);
    }
}

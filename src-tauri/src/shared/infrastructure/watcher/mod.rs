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

use std::path::Path;
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
pub struct WatcherState {
    inner: Mutex<Option<Debouncer<RecommendedWatcher, FileIdMap>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
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
                        eprintln!("[watcher] notify error: {e:?}");
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

    /// Start watching `path`. No-op if the path doesn't exist (a repo may lack
    /// `packed-refs`, for instance) or if the watcher hasn't been initialized.
    pub fn watch_path(&self, path: &Path, mode: RecursiveMode) -> Result<(), AppError> {
        if !path.exists() {
            return Ok(());
        }
        let mut guard = self.inner.lock().unwrap();
        if let Some(debouncer) = guard.as_mut() {
            debouncer.watcher().watch(path, mode).map_err(|e| {
                AppError::new(
                    format!("Failed to watch {}", path.display()),
                    "watcher_watch_failed",
                    Some(e.to_string()),
                )
            })?;
            // Track file identity under this root so the debouncer can dedupe.
            debouncer.cache().add_root(path, mode);
        }
        Ok(())
    }

    /// Stop watching `path`. Best-effort: ignores paths that aren't watched.
    pub fn unwatch_path(&self, path: &Path) {
        let mut guard = self.inner.lock().unwrap();
        if let Some(debouncer) = guard.as_mut() {
            let _ = debouncer.watcher().unwatch(path);
            debouncer.cache().remove_root(path);
        }
    }

    /// Drop the watcher entirely (stops its thread). Called on app exit.
    pub fn shutdown(&self) {
        *self.inner.lock().unwrap() = None;
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

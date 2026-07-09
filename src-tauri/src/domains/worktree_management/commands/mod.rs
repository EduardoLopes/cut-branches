mod add;
mod lock;
mod queries;
mod remove;

pub use add::add_worktree;
pub use lock::{lock_worktree, unlock_worktree};
pub use queries::list_worktrees;
pub use remove::remove_worktree;

use crate::shared::error::AppError;

/// Maps a `spawn_blocking` join failure (panic/cancellation) to an `AppError`.
/// Worktree git work runs on the blocking pool so slow git2 I/O on large repos
/// never starves the async runtime (matching the cleanup domain).
fn join_error(kind: &'static str, e: tokio::task::JoinError) -> AppError {
    AppError::new(
        "Worktree operation failed".to_string(),
        kind,
        Some(e.to_string()),
    )
}

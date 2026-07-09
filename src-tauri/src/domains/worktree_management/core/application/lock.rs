//! Use-cases: lock and unlock a worktree (§1.2).

use std::path::Path;

use crate::domains::worktree_management::error::WorktreeError;
use crate::domains::worktree_management::infrastructure::git;

/// Lock the worktree `name`, optionally recording a reason.
pub fn lock_worktree(path: &Path, name: &str, reason: Option<&str>) -> Result<(), WorktreeError> {
    git::lock_worktree(path, name, reason)
}

/// Unlock the worktree `name`.
pub fn unlock_worktree(path: &Path, name: &str) -> Result<(), WorktreeError> {
    git::unlock_worktree(path, name)
}

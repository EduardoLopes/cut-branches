//! Use-case: remove a worktree from a repository (§1.2).

use std::path::Path;

use crate::domains::worktree_management::error::WorktreeError;
use crate::domains::worktree_management::infrastructure::git;

/// Remove the linked worktree `name`, deleting its working tree and pruning its
/// admin files. The main worktree is refused; `force` allows a locked one.
pub fn remove_worktree(path: &Path, name: &str, force: bool) -> Result<(), WorktreeError> {
    git::remove_worktree(path, name, force)
}

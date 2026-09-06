//! Use-case: add a worktree to a repository (§1.2).

use std::path::Path;

use crate::domains::worktree_management::core::models::worktree::Worktree;
use crate::domains::worktree_management::error::WorktreeError;
use crate::domains::worktree_management::infrastructure::git;

/// Create a worktree `name` at `worktree_path`. When `reference` is a local
/// branch it is checked out; otherwise a new branch matching `name` is created.
pub fn add_worktree(
    path: &Path,
    name: &str,
    worktree_path: &Path,
    reference: Option<&str>,
    lock: bool,
) -> Result<Worktree, WorktreeError> {
    git::add_worktree(path, name, worktree_path, reference, lock)
}

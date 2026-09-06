//! Use-case: list a repository's worktrees (§1.2).

use std::path::Path;

use crate::domains::worktree_management::core::models::worktree::Worktree;
use crate::domains::worktree_management::error::WorktreeError;
use crate::domains::worktree_management::infrastructure::git;

/// List every worktree of the repository at `path` (main first).
pub fn list_worktrees(path: &Path) -> Result<Vec<Worktree>, WorktreeError> {
    git::list_worktrees(path)
}

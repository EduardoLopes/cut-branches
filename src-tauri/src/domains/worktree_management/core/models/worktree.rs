//! Worktree DTO (§1.2): the shape the `worktree_management` domain produces and
//! the frontend consumes. Pure serde/specta data with no behavior — it is
//! domain-specific (not a shared kernel contract), built from git2 in this
//! domain's `infrastructure::git`.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    /// Administrative name (the entry under `.git/worktrees/`). For the main
    /// worktree this is a synthesized name derived from its directory.
    pub name: String,
    /// Absolute path to the worktree's working directory.
    pub path: String,
    /// Short name of the checked-out branch, or `None` when detached or missing.
    pub branch: Option<String>,
    /// SHA of the worktree's `HEAD`, or `None` when it can't be resolved.
    pub head_sha: Option<String>,
    /// Whether the worktree is locked (protected from pruning).
    pub is_locked: bool,
    /// Optional reason recorded when the worktree was locked.
    pub lock_reason: Option<String>,
    /// The main worktree (the repository's own working directory). It can't be
    /// removed or locked, so the UI hides those actions for it.
    pub is_main: bool,
    /// Whether git considers this worktree prunable (its working directory is
    /// gone or otherwise invalid).
    pub is_prunable: bool,
}

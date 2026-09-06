//! Worktree-management domain (§1.1): lists, creates, removes, and locks git
//! worktrees for a repository. All git access goes through git2 in
//! `infrastructure::git`; this domain does not import other domains (§1.3).
//!
//! Ships behind the `worktree-management` feature flag on the frontend.

pub mod commands;
pub(crate) mod core;
pub(crate) mod error;
pub(crate) mod infrastructure;

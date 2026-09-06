//! Commit-history / branch-graph feature.
//!
//! An internal feature slice of the `branch_management` domain (guide §1.8, Approach 2):
//! it owns its own delivery (`commands`), application (`application`), domain
//! (`models`), and infrastructure (`git`), but shares the parent domain's error
//! vocabulary (`BranchError`), value objects (`BranchName`, `CommitSha`), and git
//! helpers (`format_commit_time`, `short_sha`) via intra-domain paths — it is not a
//! separate bounded context.

pub mod application;
pub mod commands;
pub mod git;
pub mod models;

pub use commands::{
    get_commit_history_window, list_branch_commits, list_branch_comparison, list_commit_history,
};

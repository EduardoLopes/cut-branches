//! Branch/commit diff feature — the review view's data source.
//!
//! An internal feature slice of the `branch_management` domain (guide §1.8,
//! Approach 2): it owns its own delivery (`commands`), application
//! (`application`), domain (`models`), and infrastructure (`git`), but shares
//! the parent domain's error vocabulary (`BranchError`) and value objects
//! (`BranchName`, `CommitSha`) via intra-domain paths — it is not a separate
//! bounded context.
//!
//! Two diff targets are supported, mirroring the two entry points in the UI:
//! a branch (diffed against its merge-base with HEAD, the same baseline as
//! the `+/-` stats badges) and a single commit (diffed against its first
//! parent; the root commit diffs against the empty tree).

pub mod application;
pub mod commands;
pub mod git;
pub mod models;

pub use commands::{get_file_diff, get_file_lines, list_changed_files};

//! Shared kernel: the `Branch` / `Commit` contract (§1.4).
//!
//! These are frozen cross-domain DTOs — the shape that `branch_management`
//! produces and `repository_management` consumes when it loads a repository.
//! They are pure serde/specta data with no behavior, no git2, and no Tauri:
//! shared *contracts and types*, never shared *behavior*. Mapping to/from a
//! domain's own persistence rows (`From<BranchRecord>`) lives in that domain's
//! infrastructure, not here.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub short_sha: String,
    pub date: String,
    /// Full commit message (subject + body).
    pub message: String,
    /// First line of the message (the subject), for compact display.
    pub summary: String,
    pub author: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub name: String,
    pub fully_merged: bool,
    pub last_commit: Commit,
    pub current: bool,
    /// Remote tracking ref this branch follows (e.g. `origin/main`); `None`
    /// when the branch has no upstream configured.
    pub upstream: Option<String>,
    pub deleted_at: Option<String>,
    pub is_reachable: Option<bool>,
    pub is_selected: bool,
    pub is_locked: bool,
}

//! Commit-history domain models for the history + branch-graph view.
//!
//! Deliberately separate from the shared-kernel `Commit` (a frozen
//! cross-domain DTO carrying a single tip commit): history needs the graph
//! topology (`parents`) and ref decorations (`refs`) that the kernel model
//! must not grow. The field overlap (sha/author/date/…) is intentional.

use serde::{Deserialize, Serialize};

/// What kind of ref points at a commit — so the UI can emphasise local branch
/// heads (the comparison unit) over tags and remotes.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RefKind {
    LocalBranch,
    RemoteBranch,
    Tag,
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RefDecoration {
    pub name: String,
    pub kind: RefKind,
}

/// A single commit in the history walk, with the topology the graph needs.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HistoryCommit {
    pub sha: String,
    pub short_sha: String,
    /// Parent SHAs, first-parent first. Empty for the root commit; >1 for merges.
    pub parents: Vec<String>,
    /// Branch/tag/remote names pointing at this commit, local branches first.
    pub refs: Vec<RefDecoration>,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
}

/// One page of the commit history walk.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HistoryPage {
    pub commits: Vec<HistoryCommit>,
    /// Cursor for the next page; `None` on the last page.
    pub next_cursor: Option<String>,
    /// Exact total number of commits in the walk.
    pub total_count: u32,
}

/// A window of history located around a target commit (deep-linking).
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HistoryWindow {
    pub commits: Vec<HistoryCommit>,
    /// Absolute index (in the full walk) of `commits[0]`.
    pub start_index: u32,
    /// Absolute index of the target commit.
    pub target_index: u32,
    /// Cursor to continue paging after this window; `None` at the end.
    pub next_cursor: Option<String>,
    pub total_count: u32,
}

/// How a local branch stands relative to the base — the cleanup signals.
/// `ahead == 0` means the branch is fully contained in base (safe to delete).
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BranchComparison {
    pub name: String,
    pub sha: String,
    /// Commits on this branch not in base (unique work — lost if deleted).
    pub ahead: u32,
    /// Commits in base not on this branch.
    pub behind: u32,
}

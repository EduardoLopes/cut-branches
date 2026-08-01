//! Delivery commands for the commit-history + branch-graph view.
//!
//! Paging is cursor-based: pass the previous page's `next_cursor` to
//! continue. A `history_cursor_stale` error means refs changed since the
//! cursor was issued — restart from the first page. History walking runs on
//! the blocking pool because the first page of a large repository pays a full
//! revwalk (later pages are O(limit) against the cached ordering).

use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::State;

use super::application as history;
use super::git::HistoryCache;
use super::models::{BranchComparison, HistoryCommit};
use crate::domains::branch_management::core::models::branch_name::BranchName;
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::shared::error::AppError;

/// Maps a `spawn_blocking` join failure (panic/cancellation) to an `AppError`.
fn join_error(kind: &'static str, e: tokio::task::JoinError) -> AppError {
    AppError::new(
        "Commit history operation failed".to_string(),
        kind,
        Some(e.to_string()),
    )
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitHistoryInput {
    /// Filesystem path to the repository (frontend resolves this from the repo id).
    pub path: String,
    /// Opaque cursor from the previous page; omit for the first page.
    #[serde(default)]
    pub cursor: Option<String>,
    /// Window size — how many commits to return (clamped to 1..=500).
    pub limit: u32,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitHistoryOutput {
    pub commits: Vec<HistoryCommit>,
    /// Cursor for the next page; `null` on the last page.
    pub next_cursor: Option<String>,
    /// Exact total number of commits in the walk.
    pub total_count: u32,
}

/// Walks history across all local branches (+ HEAD) and returns one page of
/// commits with parent edges and ref decorations.
#[tauri::command(async)]
#[specta::specta]
pub async fn list_commit_history(
    cache: State<'_, HistoryCache>,
    input: ListCommitHistoryInput,
) -> Result<ListCommitHistoryOutput, AppError> {
    let cache = cache.inner().clone();
    let page = tokio::task::spawn_blocking(move || {
        history::list_commit_history(
            &cache,
            Path::new(&input.path),
            input.cursor.as_deref(),
            input.limit,
        )
    })
    .await
    .map_err(|e| join_error("commit_history_failed", e))??;

    Ok(ListCommitHistoryOutput {
        commits: page.commits,
        next_cursor: page.next_cursor,
        total_count: page.total_count,
    })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetCommitHistoryWindowInput {
    pub path: String,
    /// Full or short SHA of the commit to locate.
    pub target_sha: String,
    /// How many commits of context to include before (newer than) the target.
    #[serde(default)]
    pub context_before: u32,
    /// Window size (clamped to 1..=500); always spans through the target.
    pub limit: u32,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetCommitHistoryWindowOutput {
    pub commits: Vec<HistoryCommit>,
    /// Absolute index (in the full walk) of `commits[0]`.
    pub start_index: u32,
    /// Absolute index of the target commit.
    pub target_index: u32,
    /// Cursor to continue paging after this window; `null` at the end.
    pub next_cursor: Option<String>,
    pub total_count: u32,
}

/// Locates a commit in the history walk and returns a window around it —
/// used for deep-linking (`?commit=<sha>`) and the hover graph preview.
#[tauri::command(async)]
#[specta::specta]
pub async fn get_commit_history_window(
    cache: State<'_, HistoryCache>,
    input: GetCommitHistoryWindowInput,
) -> Result<GetCommitHistoryWindowOutput, AppError> {
    let target = CommitSha::new(&input.target_sha)?;

    let cache = cache.inner().clone();
    let window = tokio::task::spawn_blocking(move || {
        history::get_commit_history_window(
            &cache,
            Path::new(&input.path),
            &target,
            input.context_before,
            input.limit,
        )
    })
    .await
    .map_err(|e| join_error("commit_history_failed", e))??;

    Ok(GetCommitHistoryWindowOutput {
        commits: window.commits,
        start_index: window.start_index,
        target_index: window.target_index,
        next_cursor: window.next_cursor,
        total_count: window.total_count,
    })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchCommitsInput {
    pub path: String,
    /// Local branch whose ancestry to walk.
    pub branch: String,
    /// How many commits to return, newest first (clamped to 1..=500).
    pub limit: u32,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchCommitsOutput {
    /// Newest first, carrying the full message (subject + body).
    pub commits: Vec<HistoryCommit>,
    /// Whether the branch has commits older than the returned window.
    pub has_more: bool,
}

/// Returns the newest commits reachable from one branch tip. Scoped to that
/// branch's ancestry — unlike `list_commit_history`, which walks every local
/// branch at once.
#[tauri::command(async)]
#[specta::specta]
pub async fn list_branch_commits(
    input: ListBranchCommitsInput,
) -> Result<ListBranchCommitsOutput, AppError> {
    let branch = BranchName::new(input.branch)?;

    let (commits, has_more) = tokio::task::spawn_blocking(move || {
        history::list_branch_commits(Path::new(&input.path), &branch, input.limit)
    })
    .await
    .map_err(|e| join_error("branch_commits_failed", e))??;

    Ok(ListBranchCommitsOutput { commits, has_more })
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchComparisonInput {
    pub path: String,
    /// Base branch to compare against; defaults to main/master, else HEAD.
    /// An explicit base that doesn't exist is an error.
    #[serde(default)]
    pub base: Option<String>,
    /// Local branches to compute; names that no longer exist are skipped
    /// silently (absence in the result is NOT `ahead == 0`).
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchComparisonOutput {
    pub base_name: String,
    pub base_sha: String,
    pub branches: Vec<BranchComparison>,
}

/// Computes ahead/behind vs the base for the requested local branches. A
/// branch with `ahead == 0` is fully contained in base (safe to delete).
#[tauri::command(async)]
#[specta::specta]
pub async fn list_branch_comparison(
    input: ListBranchComparisonInput,
) -> Result<ListBranchComparisonOutput, AppError> {
    let base = input.base.map(BranchName::new).transpose()?;

    let (base_name, base_sha, branches) = tokio::task::spawn_blocking(move || {
        history::list_branch_comparison(
            Path::new(&input.path),
            base.as_ref().map(|b| b.as_str()),
            &input.branch_names,
        )
    })
    .await
    .map_err(|e| join_error("branch_comparison_failed", e))??;

    Ok(ListBranchComparisonOutput {
        base_name,
        base_sha,
        branches,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{setup_history_test_repo, DirectoryGuard};

    #[tokio::test]
    async fn list_branch_comparison_rejects_invalid_base_name() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let err = list_branch_comparison(ListBranchComparisonInput {
            path: repo.path().display().to_string(),
            base: Some("bad name with spaces".to_string()),
            branch_names: vec!["feature/a".to_string()],
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_branch_name");
    }

    #[tokio::test]
    async fn list_branch_commits_rejects_invalid_branch_name() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let err = list_branch_commits(ListBranchCommitsInput {
            path: repo.path().display().to_string(),
            branch: "bad name with spaces".to_string(),
            limit: 10,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_branch_name");
    }

    #[tokio::test]
    async fn list_branch_commits_returns_the_branch_window() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let output = list_branch_commits(ListBranchCommitsInput {
            path: repo.path().display().to_string(),
            branch: "feature/a".to_string(),
            limit: 2,
        })
        .await
        .unwrap();
        assert_eq!(output.commits.len(), 2);
        assert_eq!(output.commits[0].message, "feature/a: two");
        assert!(output.has_more);
    }

    #[tokio::test]
    async fn list_branch_comparison_returns_signals() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let output = list_branch_comparison(ListBranchComparisonInput {
            path: repo.path().display().to_string(),
            base: None,
            branch_names: vec!["feature/a".to_string(), "feature/b".to_string()],
        })
        .await
        .unwrap();
        assert_eq!(output.base_name, "main");
        assert_eq!(output.branches.len(), 2);
    }

    /// Boundary validation for the window command happens before the managed
    /// state is touched, so it is testable through the value object directly:
    /// `CommitSha::new` rejects what the command rejects, and its error maps
    /// to the `invalid_commit_sha` kind.
    #[test]
    fn window_target_sha_is_validated_at_the_boundary() {
        let err: AppError = CommitSha::new("not-a-sha").unwrap_err().into();
        assert_eq!(err.kind, "invalid_commit_sha");

        let err: AppError = CommitSha::new("").unwrap_err().into();
        assert_eq!(err.kind, "invalid_commit_sha");
    }
}

//! Use-cases for the commit-history + branch-graph view.
//!
//! Thin orchestration over `infrastructure::git::history`; boundary
//! validation (value objects) happens in the command layer.

use std::path::Path;

use super::git::{self as history, HistoryCache};
use super::models::{BranchComparison, HistoryPage, HistoryWindow};
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::shared::error::AppError;

/// One page of commit history across all local branches (+ HEAD).
pub fn list_commit_history(
    cache: &HistoryCache,
    path: &Path,
    cursor: Option<&str>,
    limit: u32,
) -> Result<HistoryPage, AppError> {
    Ok(history::list_commit_history(cache, path, cursor, limit)?)
}

/// A window of history located around a target commit (deep-link / preview).
pub fn get_commit_history_window(
    cache: &HistoryCache,
    path: &Path,
    target: &CommitSha,
    context_before: u32,
    limit: u32,
) -> Result<HistoryWindow, AppError> {
    Ok(history::get_commit_history_window(
        cache,
        path,
        target.as_str(),
        context_before,
        limit,
    )?)
}

/// Ahead/behind vs the base for exactly the requested local branches.
pub fn list_branch_comparison(
    path: &Path,
    base: Option<&str>,
    branch_names: &[String],
) -> Result<(String, String, Vec<BranchComparison>), AppError> {
    Ok(history::list_branch_comparison(path, base, branch_names)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{setup_history_test_repo, DirectoryGuard};

    #[test]
    fn use_cases_pass_through_to_infrastructure() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        let page = list_commit_history(&cache, repo.path(), None, 3).unwrap();
        assert_eq!(page.commits.len(), 3);
        assert_eq!(page.total_count, 7);

        let target = CommitSha::new(&page.commits[1].sha).unwrap();
        let window = get_commit_history_window(&cache, repo.path(), &target, 1, 3).unwrap();
        assert_eq!(window.target_index, 1);

        let (base_name, _, branches) =
            list_branch_comparison(repo.path(), None, &["feature/a".to_string()]).unwrap();
        assert_eq!(base_name, "main");
        assert_eq!(branches.len(), 1);
    }
}

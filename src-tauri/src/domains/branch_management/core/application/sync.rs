use crate::shared::error::AppError;
use crate::shared::infrastructure::db::{
    models::{NewBranchRecord, NewCommitRecord},
    DbConnection,
};
use std::collections::HashSet;
use std::path::Path;

use crate::domains::branch_management::infrastructure::git::branch::{
    get_all_branches_with_last_commit, Branch,
};

/// Synchronizes branches from Git repository to database.
/// This function will:
/// - Insert new branches that exist in Git but not in DB
/// - Update existing branches with latest commit info
/// - Mark branches as deleted (soft delete) that exist in DB but not in Git
///
/// # Arguments
///
/// * `git_branches` - Pre-fetched branches from Git (pass None to fetch internally)
/// * `path` - Path to the git repository (only used if git_branches is None)
/// * `repo_id` - Repository ID in database
/// * `conn` - Pooled database connection (resolved by the caller from `DatabaseState`)
///
/// # Returns
///
/// * `Result<usize, AppError>` - Number of branches synced or an error
pub fn sync_branches_to_db(
    git_branches: Option<&[Branch]>,
    path: Option<&Path>,
    repo_id: &str,
    conn: &mut DbConnection,
) -> Result<usize, AppError> {
    // Get branches from Git - either use provided or fetch
    let fetched_branches;
    let git_branches = match git_branches {
        Some(branches) => branches,
        None => {
            let path = path.ok_or_else(|| {
                AppError::new(
                    "Path is required when git_branches is not provided".to_string(),
                    "missing_path",
                    None,
                )
            })?;
            fetched_branches = get_all_branches_with_last_commit(path)?;
            &fetched_branches
        }
    };

    // Get existing branches from database for this repository (both active and deleted)
    let filters = crate::domains::branch_management::filters::BranchFilters {
        deletion_status: crate::domains::branch_management::filters::DeletionStatusFilter::All,
        ..Default::default()
    };
    let db_branches = crate::domains::branch_management::infrastructure::repositories::get_branches_for_repository(
        conn, repo_id, &filters,
    )
    .map_err(|e| {
        AppError::new(
            "Failed to get branches from database".to_string(),
            "db_query_failed",
            Some(e.to_string()),
        )
    })?;

    // Create a set of Git branch names for quick lookup
    let git_branch_names: HashSet<String> = git_branches.iter().map(|b| b.name.clone()).collect();

    // Convert all branches to NewBranchRecord format
    let new_branches: Vec<_> = git_branches
        .iter()
        .map(|git_branch| branch_to_new_branch(repo_id, git_branch))
        .collect();

    // Tip commits, deduplicated by SHA (several branches can share a tip)
    let mut seen_shas = HashSet::new();
    let new_commits: Vec<_> = git_branches
        .iter()
        .filter(|b| seen_shas.insert(b.last_commit.sha.clone()))
        .map(branch_to_new_commit)
        .collect();

    // Use batch upsert for better performance with many branches.
    // Commits go first: branch rows reference them by FK.
    use diesel::Connection;
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        crate::domains::branch_management::infrastructure::repositories::upsert_commits_batch(
            conn,
            &new_commits,
        )?;
        crate::domains::branch_management::infrastructure::repositories::upsert_branches_batch(
            conn,
            &new_branches,
        )?;
        Ok(())
    })
    .map_err(|e| {
        AppError::new(
            "Failed to sync branches to database".to_string(),
            "db_batch_upsert_failed",
            Some(e.to_string()),
        )
    })?;

    // Mark branches as deleted that exist in DB but not in Git (excluding already deleted ones)
    let branches_to_mark_deleted: Vec<String> = db_branches
        .iter()
        .filter(|(db_branch, _)| {
            db_branch.deleted_at.is_none() && !git_branch_names.contains(&db_branch.name)
        })
        .map(|(b, _)| b.name.clone())
        .collect();

    if !branches_to_mark_deleted.is_empty() {
        crate::domains::branch_management::infrastructure::repositories::mark_branches_deleted(
            conn,
            repo_id,
            &branches_to_mark_deleted,
        )
        .map_err(|e| {
            AppError::new(
                "Failed to mark branches as deleted in database".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;
    }

    // Sweep commit rows that no branch (active or soft-deleted) references
    // anymore — e.g. after branch rows were hard-deleted with their repository.
    crate::domains::branch_management::infrastructure::repositories::delete_orphan_commits(conn)
        .map_err(|e| {
            AppError::new(
                "Failed to prune orphaned commits".to_string(),
                "db_delete_failed",
                Some(e.to_string()),
            )
        })?;

    // Opportunistic hygiene for the branch-metrics cache: sync already runs
    // whenever refs changed, which is exactly when old (head, tip) pairs stop
    // being looked up. Failure is non-fatal — pruning is an optimization.
    if let Err(e) =
        crate::domains::branch_management::infrastructure::repositories::prune_branch_metrics_cache(
            conn,
        )
    {
        log::warn!("Failed to prune branch metrics cache: {e}");
    }

    // Note: the repository's `last_synced_at` is owned by repository_management,
    // which sets it when creating/updating the repo record — branch sync no longer
    // writes the repositories table (data ownership, ADR 002).

    Ok(git_branches.len())
}

// Keep backwards compatible wrapper for old code
#[allow(dead_code)]
pub fn sync_branches_to_db_legacy(
    path: &Path,
    repo_id: &str,
    conn: &mut DbConnection,
) -> Result<usize, AppError> {
    sync_branches_to_db(None, Some(path), repo_id, conn)
}

/// Converts a Git branch to a NewBranchRecord for database insertion
fn branch_to_new_branch(repo_id: &str, branch: &Branch) -> NewBranchRecord {
    NewBranchRecord {
        repository_id: repo_id.to_string(),
        name: branch.name.clone(),
        current: branch.current,
        fully_merged: branch.fully_merged,
        head_commit_sha: branch.last_commit.sha.clone(),
        upstream: branch.upstream.clone(),
        deleted_at: None,
        is_reachable: None,
        is_selected: false,
        is_locked: false,
    }
}

/// Converts a Git branch's tip commit to a NewCommitRecord for database insertion
fn branch_to_new_commit(branch: &Branch) -> NewCommitRecord {
    NewCommitRecord {
        sha: branch.last_commit.sha.clone(),
        short_sha: branch.last_commit.short_sha.clone(),
        date: branch.last_commit.date.clone(),
        message: branch.last_commit.message.clone(),
        summary: branch.last_commit.summary.clone(),
        author: branch.last_commit.author.clone(),
        email: branch.last_commit.email.clone(),
    }
}

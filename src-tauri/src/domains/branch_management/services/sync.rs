use crate::db::{models::NewBranchRecord, DatabaseState};
use crate::shared::error::AppError;
use std::collections::HashSet;
use std::path::Path;
use tauri::State;

use super::super::git::branch::{get_all_branches_with_last_commit, Branch};

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
/// * `db` - Database state
///
/// # Returns
///
/// * `Result<usize, AppError>` - Number of branches synced or an error
pub fn sync_branches_to_db(
    git_branches: Option<&[Branch]>,
    path: Option<&Path>,
    repo_id: &str,
    db: &State<DatabaseState>,
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

    // Get database connection
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    // Get existing branches from database for this repository
    let db_branches = crate::db::operations::get_branches_for_repository(&mut conn, repo_id)
        .map_err(|e| {
            AppError::new(
                "Failed to get branches from database".to_string(),
                "db_query_failed",
                Some(e.to_string()),
            )
        })?;

    // Create a set of Git branch names for quick lookup
    let git_branch_names: HashSet<String> = git_branches.iter().map(|b| b.name.clone()).collect();

    // Upsert branches that exist in Git
    for git_branch in git_branches {
        let new_branch = branch_to_new_branch(repo_id, git_branch);
        crate::db::operations::upsert_branch(&mut conn, new_branch).map_err(|e| {
            AppError::new(
                format!("Failed to upsert branch '{}' to database", git_branch.name),
                "db_upsert_failed",
                Some(e.to_string()),
            )
        })?;
    }

    // Mark branches as deleted that exist in DB but not in Git (excluding already deleted ones)
    let branches_to_mark_deleted: Vec<String> = db_branches
        .iter()
        .filter(|db_branch| {
            db_branch.deleted_at.is_none() && !git_branch_names.contains(&db_branch.name)
        })
        .map(|b| b.name.clone())
        .collect();

    if !branches_to_mark_deleted.is_empty() {
        crate::db::operations::mark_branches_deleted(&mut conn, repo_id, &branches_to_mark_deleted)
            .map_err(|e| {
                AppError::new(
                    "Failed to mark branches as deleted in database".to_string(),
                    "db_update_failed",
                    Some(e.to_string()),
                )
            })?;
    }

    Ok(git_branches.len())
}

// Keep backwards compatible wrapper for old code
#[allow(dead_code)]
pub fn sync_branches_to_db_legacy(
    path: &Path,
    repo_id: &str,
    db: &State<DatabaseState>,
) -> Result<usize, AppError> {
    sync_branches_to_db(None, Some(path), repo_id, db)
}

/// Converts a Git branch to a NewBranchRecord for database insertion
fn branch_to_new_branch(repo_id: &str, branch: &Branch) -> NewBranchRecord {
    NewBranchRecord {
        repository_id: repo_id.to_string(),
        name: branch.name.clone(),
        current: branch.current,
        fully_merged: branch.fully_merged,
        last_commit_sha: branch.last_commit.sha.clone(),
        last_commit_short_sha: branch.last_commit.short_sha.clone(),
        last_commit_date: branch.last_commit.date.clone(),
        last_commit_message: branch.last_commit.message.clone(),
        last_commit_author: branch.last_commit.author.clone(),
        last_commit_email: branch.last_commit.email.clone(),
        deleted_at: None,
        is_reachable: None,
    }
}

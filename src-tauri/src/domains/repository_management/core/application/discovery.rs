use std::path::Path;

use crate::domains::repository_management::core::models::GitDirResponse;
use crate::domains::repository_management::core::ports::BranchGateway;
use crate::domains::repository_management::error::RepositoryError;
use crate::domains::repository_management::infrastructure::repositories as operations;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::{models::NewRepository, DbConnection};

/// Get information about a git repository from the database.
/// This is a DB-first operation that only syncs if the repository data is stale.
///
/// # Arguments
///
/// * `repo_id` - Repository ID
/// * `conn` - Pooled database connection (resolved by the delivery layer)
///
/// # Returns
///
/// * `Result<GitDirResponse, AppError>` - Repository information or an error
pub async fn get_repository(
    repo_id: &str,
    conn: &mut DbConnection,
    branch: &dyn BranchGateway,
) -> Result<GitDirResponse, AppError> {
    log::debug!("get_repository called for id: {}", repo_id);

    // DB-FIRST: Get repository from database
    let db_repo =
        operations::get_repository(conn, repo_id).map_err(|_| RepositoryError::NotFound {
            id: repo_id.to_string(),
        })?;

    log::debug!("Repository found in DB: {}", db_repo.name);

    // Get path from database
    let root_path = db_repo.path.clone();
    let raw_root_path = Path::new(&root_path);

    // Check if it's a git repository
    if !super::validation::is_git_repository(raw_root_path)? {
        return Err(AppError::new(
            format!(
                "The folder **{}** is not a git repository",
                raw_root_path
                    .file_name()
                    .unwrap_or(raw_root_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            Some(format!(
                "The path **{}** does not contain a .git directory",
                raw_root_path.display()
            )),
        ));
    }

    // Repository exists in DB - sync if needed
    sync_repository_if_needed(raw_root_path, repo_id, conn, branch).await?;

    // Get fresh data from DB after sync
    let updated_repo = operations::get_repository(conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to get updated repository from database".to_string(),
            "db_query_failed",
            Some(e.to_string()),
        )
    })?;

    // Get branches through the branch gateway (use fast version for performance)
    let mut branches = branch.list_branches_fast(raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));

    Ok(GitDirResponse {
        path: root_path,
        branches,
        current_branch: updated_repo.current_branch,
        branches_count: updated_repo.branches_count as u32,
        name: updated_repo.name,
        id: updated_repo.id,
        last_synced_at: updated_repo.last_synced_at,
    })
}

/// Syncs repository data if it has changed.
/// Uses a fast hash-based detection to avoid expensive git operations when possible.
async fn sync_repository_if_needed(
    raw_root_path: &Path,
    repo_name: &str,
    conn: &mut DbConnection,
    branch: &dyn BranchGateway,
) -> Result<(), AppError> {
    // Compute current repository state fingerprint (ultra-fast: ~1-2ms)
    let current_timestamp = crate::domains::repository_management::infrastructure::state_hash::compute_repo_state_timestamp(raw_root_path)?;

    let db_repo = operations::get_repository(conn, repo_name).map_err(|e| {
        AppError::new(
            "Failed to get repository from database".to_string(),
            "db_query_failed",
            Some(e.to_string()),
        )
    })?;

    // Check if timestamp changed - this detects ALL changes (branches, commits, etc.)
    let needs_sync = match db_repo.last_sync_timestamp {
        Some(stored_timestamp) => stored_timestamp != current_timestamp,
        None => true, // First sync
    };

    if needs_sync {
        log::info!(
            "Repository state changed (fingerprint: {} -> {}), syncing...",
            db_repo.last_sync_timestamp.unwrap_or(0),
            current_timestamp
        );

        resync_repository(raw_root_path, repo_name, conn, branch)?;

        log::info!("Sync completed");
    } else {
        log::debug!(
            "Repository state unchanged (fingerprint: {}), skipping sync",
            current_timestamp
        );
        operations::bump_last_synced_at(conn, repo_name).map_err(|e| {
            AppError::new(
                "Failed to record sync timestamp".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;
    }

    Ok(())
}

/// Force a re-sync of a repository's branches from disk into the database.
///
/// Unlike [`sync_repository_if_needed`], this does **not** short-circuit on the
/// state fingerprint — callers (notably the filesystem watcher) already know
/// something changed, so recomputing and comparing would be wasted work. It
/// recomputes the fingerprint, refreshes the repository row's metadata, and
/// reconciles branches through the [`BranchGateway`].
///
/// Synchronous by design so it can run on the watcher's debouncer thread
/// (no `.await`, no pooled connection held across an await point).
///
/// # Arguments
///
/// * `raw_root_path` - Working-directory root of the repository
/// * `repo_id` - Repository ID in the database
/// * `conn` - Pooled database connection
/// * `branch` - Branch gateway used to list git branches and sync them to the DB
pub(crate) fn resync_repository(
    raw_root_path: &Path,
    repo_id: &str,
    conn: &mut DbConnection,
    branch: &dyn BranchGateway,
) -> Result<(), AppError> {
    let current_timestamp = crate::domains::repository_management::infrastructure::state_hash::compute_repo_state_timestamp(raw_root_path)?;

    // Get full branch list (use fast version for better performance)
    let branches = branch.list_branches_fast(raw_root_path)?;
    let branches_count = branches.len() as i32;

    // Get current branch name
    let current_branch = branch.current_branch(raw_root_path)?;

    // Update repository metadata with the new fingerprint
    let updated_repo = NewRepository {
        id: repo_id.to_string(),
        name: repo_id.to_string(),
        path: raw_root_path.to_string_lossy().into_owned(),
        current_branch,
        branches_count,
        last_sync_timestamp: Some(current_timestamp),
        last_synced_at: Some(chrono::Utc::now().naive_utc()),
    };

    operations::update_repository(conn, repo_id, updated_repo).map_err(|e| {
        AppError::new(
            "Failed to update repository in database".to_string(),
            "db_update_failed",
            Some(e.to_string()),
        )
    })?;

    // Sync branches to database through the branch gateway
    branch
        .sync_branches(&branches, repo_id, conn)
        .map_err(|e| {
            AppError::new(
                "Failed to sync branches to database".to_string(),
                "branch_sync_failed",
                Some(e.to_string()),
            )
        })?;

    Ok(())
}

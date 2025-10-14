use std::path::Path;
use tauri::State;

use crate::db::{models::NewRepository, operations, DatabaseState};
use crate::domains::branch_management::git::branch::Branch;
use crate::shared::error::AppError;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    pub current_branch: String,
    pub branches_count: u32,
    pub name: String,
    pub id: String,
}

/// Get information about a git repository from the database.
/// This is a DB-first operation that only syncs if the repository data is stale.
///
/// # Arguments
///
/// * `raw_path` - Path to the git repository
/// * `path` - Original path string
/// * `db` - Database state for persisting repository data
///
/// # Returns
///
/// * `Result<GitDirResponse, AppError>` - Repository information or an error
pub async fn get_repository(
    raw_path: &Path,
    path: &str,
    db: &State<'_, DatabaseState>,
) -> Result<GitDirResponse, AppError> {
    println!("get_repository called for path: {}", path);

    // Check if it's a git repository
    if !super::validation::is_git_repository(raw_path)? {
        return Err(AppError::new(
            format!(
                "The folder **{}** is not a git repository",
                raw_path
                    .file_name()
                    .unwrap_or(raw_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            Some(format!(
                "The path **{}** does not contain a .git directory",
                raw_path.display()
            )),
        ));
    }

    // Get root path using path operations domain
    let root_path_response =
        crate::domains::path_operations::service::get_root_path(path.to_string()).await?;
    let root_path = root_path_response.root_path;
    let raw_root_path = Path::new(&root_path);

    // Extract repository name
    let repo_name = raw_root_path
        .file_name()
        .ok_or_else(|| {
            AppError::new(
                "Failed to get repository name".to_string(),
                "repo_name_failed",
                Some("Could not extract the repository name from the file path".to_string()),
            )
        })?
        .to_str()
        .ok_or_else(|| {
            AppError::new(
                "Failed to convert repository name to string".to_string(),
                "repo_name_failed",
                Some("Repository name contains invalid UTF-8 characters".to_string()),
            )
        })?
        .to_string();

    // DB-FIRST: Check if repository exists in database
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let db_repo = operations::get_repository(&mut conn, &repo_name);

    match db_repo {
        Ok(repo) => {
            println!("Repository found in DB: {}", repo.name);
            // Repository exists in DB - sync if needed
            sync_repository_if_needed(raw_root_path, &repo_name, &root_path, db).await?;

            // Get fresh data from DB after sync
            let updated_repo = operations::get_repository(&mut conn, &repo_name).map_err(|e| {
                AppError::new(
                    "Failed to get updated repository from database".to_string(),
                    "db_query_failed",
                    Some(e.to_string()),
                )
            })?;

            // Get branches from branch management domain (use fast version for performance)
            let mut branches =
                crate::domains::branch_management::git::branch::get_all_branches_with_last_commit_fast(
                    raw_root_path,
                )?;
            branches.sort_by(|a, b| b.current.cmp(&a.current));

            Ok(GitDirResponse {
                path: root_path,
                branches,
                current_branch: updated_repo.current_branch,
                branches_count: updated_repo.branches_count as u32,
                name: updated_repo.name,
                id: updated_repo.id,
            })
        }
        Err(_) => {
            println!("Repository NOT found in DB: {}", repo_name);
            // Repository doesn't exist in DB - return error
            // User must explicitly add the repository first
            Err(AppError::new(
                format!("Repository '{}' not found", repo_name),
                "repository_not_found",
                Some(format!(
                    "Please add the repository at '{}' first before accessing it",
                    root_path
                )),
            ))
        }
    }
}

/// Syncs repository data if it has changed.
/// Uses a fast hash-based detection to avoid expensive git operations when possible.
async fn sync_repository_if_needed(
    raw_root_path: &Path,
    repo_name: &str,
    root_path: &str,
    db: &State<'_, DatabaseState>,
) -> Result<(), AppError> {
    // Compute current repository state timestamp (ultra-fast: ~0.5-2ms)
    let current_timestamp = super::state_hash::compute_repo_state_timestamp(raw_root_path)?;

    // Get database connection
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let db_repo = operations::get_repository(&mut conn, repo_name).map_err(|e| {
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
        println!(
            "Repository state changed (timestamp: {} -> {}), syncing...",
            db_repo.last_sync_timestamp.unwrap_or(0),
            current_timestamp
        );

        // Get full branch list (use fast version for better performance)
        let branches =
            crate::domains::branch_management::git::branch::get_all_branches_with_last_commit_fast(
                raw_root_path,
            )?;
        let branches_count = branches.len() as i32;

        // Get current branch name
        let current_branch =
            crate::domains::branch_management::git::branch::get_current_branch(raw_root_path)?;

        // Update repository metadata with new timestamp
        let updated_repo = NewRepository {
            id: repo_name.to_string(),
            name: repo_name.to_string(),
            path: root_path.to_string(),
            current_branch: current_branch.to_string(),
            branches_count,
            last_sync_hash: None, // Deprecated, keeping for backward compatibility
            last_sync_timestamp: Some(current_timestamp),
        };

        operations::update_repository(&mut conn, repo_name, updated_repo).map_err(|e| {
            AppError::new(
                "Failed to update repository in database".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;

        // Sync branches to database, passing the already-fetched branches
        crate::domains::branch_management::services::sync::sync_branches_to_db(
            Some(&branches),
            None,
            repo_name,
            db,
        )
        .map_err(|e| {
            AppError::new(
                "Failed to sync branches to database".to_string(),
                "branch_sync_failed",
                Some(e.to_string()),
            )
        })?;

        println!("Sync completed");
    } else {
        println!(
            "Repository state unchanged (timestamp: {}), skipping sync",
            current_timestamp
        );
    }

    Ok(())
}

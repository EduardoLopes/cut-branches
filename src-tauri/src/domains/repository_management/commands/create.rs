use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::domains::repository_management::core::models::repository_path::RepositoryPath;
use crate::domains::repository_management::core::ports::RepositoryServices;
use crate::domains::repository_management::error::RepositoryError;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::{models::NewRepository, DatabaseState};
use crate::shared::infrastructure::watcher::WatcherState;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepositoryInput {
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepositoryOutput {
    pub path: String,
    pub branches: Vec<crate::shared::kernel::branch::Branch>,
    pub current_branch: String,
    pub branches_count: u32,
    pub name: String,
    pub id: String,
}

/// Creates a new repository entry in the database.
/// This should only be called when a user explicitly adds a repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing the repository path
/// * `db` - Database state for persisting repository data
///
/// # Returns
///
/// * `Result<CreateRepositoryOutput, AppError>` - Repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn create_repository(
    db: State<'_, DatabaseState>,
    services: State<'_, RepositoryServices>,
    watcher: State<'_, WatcherState>,
    input: CreateRepositoryInput,
) -> Result<CreateRepositoryOutput, AppError> {
    println!("create_repository called for path: {}", input.path);

    // Validate/normalize the path at the boundary (§1.2).
    let repo_path = RepositoryPath::new(input.path)?;
    let raw_path = repo_path.as_path();

    // Check if it's a git repository
    if !super::super::core::application::validation::is_git_repository(raw_path)? {
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

    // Resolve the repository root through the path gateway
    let root_path = services.path.resolve_root_path(raw_path)?;

    let raw_root_path = Path::new(&root_path);

    // Get branches through the branch gateway (use fast version for performance)
    let mut branches = services.branch.list_branches_fast(raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current = services.branch.current_branch(raw_root_path)?;

    // Extract repository name
    let repo_name = raw_root_path
        .file_name()
        .ok_or(RepositoryError::NameExtractionFailed)?
        .to_str()
        .ok_or(RepositoryError::NameNotUtf8)?
        .to_string();
    let branches_count = branches.len() as u32;

    // Create repository in database - wrap everything in a transaction for atomicity and performance
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    // Compute initial state timestamp
    let initial_timestamp =
        crate::domains::repository_management::infrastructure::state_hash::compute_repo_state_timestamp(raw_root_path)?;

    let new_repo = NewRepository {
        id: repo_name.clone(),
        name: repo_name.clone(),
        path: root_path.clone(),
        current_branch: current.to_string(),
        branches_count: branches_count as i32,
        last_sync_timestamp: Some(initial_timestamp),
        last_synced_at: Some(chrono::Utc::now().naive_utc()),
    };

    // Use a transaction to ensure atomicity and improve performance
    use diesel::Connection;
    conn.transaction::<_, AppError, _>(|conn| {
        // Check if repository already exists
        let existing =
            crate::domains::repository_management::infrastructure::repositories::get_repository(
                conn, &repo_name,
            );
        if existing.is_ok() {
            return Err(RepositoryError::AlreadyExists {
                name: repo_name.clone(),
            }
            .into());
        }

        // Create the repository
        crate::domains::repository_management::infrastructure::repositories::create_repository(
            conn, new_repo,
        )
        .map_err(|e| {
            AppError::new(
                "Failed to create repository in database".to_string(),
                "db_create_failed",
                Some(e.to_string()),
            )
        })?;

        Ok(())
    })?;

    // Sync branches from Git to database, passing already-fetched branches
    // This is done in its own transaction in sync_branches_to_db
    services
        .branch
        .sync_branches(&branches, &repo_name, &mut conn)
        .map_err(|e| {
            AppError::new(
                "Failed to sync branches to database".to_string(),
                "branch_sync_failed",
                Some(e.to_string()),
            )
        })?;

    // Start watching the new repository's git ref surface for external changes.
    super::watch::watch_repository(&watcher, &root_path);

    println!("Repository created successfully: {}", repo_name);

    Ok(CreateRepositoryOutput {
        path: root_path,
        branches,
        current_branch: current.to_string(),
        branches_count,
        name: repo_name.clone(),
        id: repo_name,
    })
}

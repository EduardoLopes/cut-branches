use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::{models::NewRepository, DatabaseState};
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepositoryInput {
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepositoryOutput {
    pub path: String,
    pub branches: Vec<crate::domains::branch_management::git::branch::Branch>,
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
    input: CreateRepositoryInput,
) -> Result<CreateRepositoryOutput, AppError> {
    println!("create_repository called for path: {}", input.path);

    let raw_path = Path::new(&input.path);

    // Check if it's a git repository
    if !super::super::services::validation::is_git_repository(raw_path)? {
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
        crate::domains::path_operations::service::get_root_path(input.path.clone()).await?;
    let root_path = root_path_response.root_path;

    let raw_root_path = Path::new(&root_path);

    // Get branches from branch management domain
    let mut branches =
        crate::domains::branch_management::git::branch::get_all_branches_with_last_commit(
            raw_root_path,
        )?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current =
        crate::domains::branch_management::git::branch::get_current_branch(raw_root_path)?;

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
    let branches_count = branches.len() as u32;

    // Create repository in database
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let new_repo = NewRepository {
        id: repo_name.clone(),
        name: repo_name.clone(),
        path: root_path.clone(),
        current_branch: current.to_string(),
        branches_count: branches_count as i32,
    };

    // Check if repository already exists
    let existing = crate::db::operations::get_repository(&mut conn, &repo_name);
    if existing.is_ok() {
        return Err(AppError::new(
            format!("Repository '{}' already exists", repo_name),
            "repository_already_exists",
            Some(format!(
                "A repository with the name '{}' is already in the database",
                repo_name
            )),
        ));
    }

    // Create the repository
    crate::db::operations::create_repository(&mut conn, new_repo).map_err(|e| {
        AppError::new(
            "Failed to create repository in database".to_string(),
            "db_create_failed",
            Some(e.to_string()),
        )
    })?;

    // Sync branches from Git to database
    crate::domains::branch_management::services::sync::sync_branches_to_db(
        raw_root_path,
        &repo_name,
        &db,
    )
    .map_err(|e| {
        AppError::new(
            "Failed to sync branches to database".to_string(),
            "branch_sync_failed",
            Some(e.to_string()),
        )
    })?;

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

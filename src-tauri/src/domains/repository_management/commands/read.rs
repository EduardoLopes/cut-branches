use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseState;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryInput {
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryOutput {
    pub path: String,
    pub branches: Vec<crate::domains::branch_management::git::branch::Branch>,
    pub current_branch: String,
    pub branches_count: u32,
    pub name: String,
    pub id: String,
}

/// Gets information about a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing the repository path
/// * `db` - Database state for persisting repository data
///
/// # Returns
///
/// * `Result<GetRepositoryOutput, AppError>` - Repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repository(
    db: State<'_, DatabaseState>,
    input: GetRepositoryInput,
) -> Result<GetRepositoryOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let response =
        super::super::services::discovery::get_repository(raw_path, &input.path, &db).await?;

    Ok(GetRepositoryOutput {
        path: response.path,
        branches: response.branches,
        current_branch: response.current_branch,
        branches_count: response.branches_count,
        name: response.name,
        id: response.id,
    })
}

/// List all repositories from the database.
///
/// # Arguments
///
/// * `db` - Database state for retrieving repositories
///
/// # Returns
///
/// * `Result<Vec<crate::db::models::Repository>, AppError>` - List of repositories or an error
#[tauri::command]
#[specta::specta]
pub fn list_repositories(
    db: State<'_, DatabaseState>,
) -> Result<Vec<crate::db::models::Repository>, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let repos = crate::db::operations::list_repositories(&mut conn).map_err(|e| {
        AppError::new(
            "Failed to list repositories".to_string(),
            "db_list_failed",
            Some(e.to_string()),
        )
    })?;

    println!("list_repositories: Found {} repositories", repos.len());
    for repo in &repos {
        println!("  - {} (id: {})", repo.name, repo.id);
    }

    Ok(repos)
}

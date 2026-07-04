use serde::{Deserialize, Serialize};
use tauri::State;

use crate::domains::repository_management::core::ports::RepositoryServices;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryInput {
    pub id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryOutput {
    pub path: String,
    pub branches: Vec<crate::shared::kernel::branch::Branch>,
    pub current_branch: String,
    pub branches_count: u32,
    pub name: String,
    pub id: String,
    pub last_synced_at: Option<chrono::NaiveDateTime>,
}

/// Gets information about a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing the repository ID
/// * `db` - Database state for persisting repository data
///
/// # Returns
///
/// * `Result<GetRepositoryOutput, AppError>` - Repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repository(
    db: State<'_, DatabaseState>,
    services: State<'_, RepositoryServices>,
    input: GetRepositoryInput,
) -> Result<GetRepositoryOutput, AppError> {
    let mut conn = db.connection()?;
    let response = super::super::core::application::discovery::get_repository(
        &input.id,
        &mut conn,
        services.branch.as_ref(),
    )
    .await?;

    Ok(GetRepositoryOutput {
        path: response.path,
        branches: response.branches,
        current_branch: response.current_branch,
        branches_count: response.branches_count,
        name: response.name,
        id: response.id,
        last_synced_at: response.last_synced_at,
    })
}

/// Get all repositories from the database.
///
/// # Arguments
///
/// * `db` - Database state for retrieving repositories
///
/// # Returns
///
/// * `Result<Vec<crate::shared::infrastructure::db::models::Repository>, AppError>` - List of repositories or an error
#[tauri::command]
#[specta::specta]
pub fn get_repository_list(
    db: State<'_, DatabaseState>,
) -> Result<Vec<crate::shared::infrastructure::db::models::Repository>, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let repos =
        crate::domains::repository_management::infrastructure::repositories::get_repository_list(
            &mut conn,
        )
        .map_err(|e| {
            AppError::new(
                "Failed to get repository list".to_string(),
                "db_list_failed",
                Some(e.to_string()),
            )
        })?;

    log::debug!("get_repository_list: Found {} repositories", repos.len());
    for repo in &repos {
        log::debug!("  - {} (id: {})", repo.name, repo.id);
    }

    Ok(repos)
}

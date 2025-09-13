use std::path::Path;

use serde::{Deserialize, Serialize};

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
///
/// # Returns
///
/// * `Result<GetRepositoryOutput, AppError>` - Repository information or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repository(input: GetRepositoryInput) -> Result<GetRepositoryOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let response = super::super::services::discovery::get_repository(raw_path, &input.path).await?;

    Ok(GetRepositoryOutput {
        path: response.path,
        branches: response.branches,
        current_branch: response.current_branch,
        branches_count: response.branches_count,
        name: response.name,
        id: response.id,
    })
}

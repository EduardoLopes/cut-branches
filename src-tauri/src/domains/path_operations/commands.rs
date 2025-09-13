use std::path::Path;

use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryRootInput {
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetRepositoryRootOutput {
    pub root_path: String,
    pub id: Option<String>,
}

/// Gets the root path of a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing the path to check
///
/// # Returns
///
/// * `Result<GetRepositoryRootOutput, AppError>` - The root path and ID, or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_repository_root(
    input: GetRepositoryRootInput,
) -> Result<GetRepositoryRootOutput, AppError> {
    let _raw_path = Path::new(&input.path); // Unused for now, but kept for future validation
    let response = super::service::get_root_path(input.path).await?;

    Ok(GetRepositoryRootOutput {
        root_path: response.root_path,
        id: response.id,
    })
}

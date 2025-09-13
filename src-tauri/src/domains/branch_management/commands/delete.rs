use std::path::Path;

use super::super::services::deletion::DeletedBranchInfo;
use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBranchesInput {
    pub path: String,
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBranchesOutput {
    pub deleted_branches: Vec<DeletedBranchInfo>,
}

/// Deletes branches from a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch names to delete
///
/// # Returns
///
/// * `Result<DeleteBranchesOutput, AppError>` - The deleted branches or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_branches(input: DeleteBranchesInput) -> Result<DeleteBranchesOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let deleted_branch_infos: Vec<DeletedBranchInfo> =
        super::super::services::deletion::delete_branches(raw_path, &input.branches)?;

    Ok(DeleteBranchesOutput {
        deleted_branches: deleted_branch_infos,
    })
}

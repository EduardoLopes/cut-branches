use std::path::Path;
use tauri::State;

use super::super::core::models::DeletedBranchInfo;
use crate::db::DatabaseState;
use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBranchesInput {
    pub path: String,
    pub repo_id: String,
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBranchesOutput {
    pub deleted_branches: Vec<DeletedBranchInfo>,
}

/// Deletes multiple branches from a git repository.
///
/// # Arguments
///
/// * `db` - Database state for soft-deleting branches
/// * `input` - Input parameters containing path and branch names to delete
///
/// # Returns
///
/// * `Result<BatchDeleteBranchesOutput, AppError>` - The deleted branches or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn batch_delete_branches(
    db: State<'_, DatabaseState>,
    input: BatchDeleteBranchesInput,
) -> Result<BatchDeleteBranchesOutput, AppError> {
    let raw_path = Path::new(&input.path);

    // Delete branches from Git
    let deleted_branch_infos: Vec<DeletedBranchInfo> =
        super::super::core::application::deletion::delete_branches(raw_path, &input.branches)?;

    // Soft-delete branches in database
    let branch_names: Vec<String> = deleted_branch_infos
        .iter()
        .map(|info| info.branch.name.clone())
        .collect();

    if !branch_names.is_empty() {
        let mut conn = db.get_connection().map_err(|e| {
            AppError::new(
                "Failed to get database connection".to_string(),
                "db_connection_failed",
                Some(e),
            )
        })?;

        crate::db::operations::mark_branches_deleted(&mut conn, &input.repo_id, &branch_names)
            .map_err(|e| {
                AppError::new(
                    "Failed to mark branches as deleted in database".to_string(),
                    "db_update_failed",
                    Some(e.to_string()),
                )
            })?;
    }

    Ok(BatchDeleteBranchesOutput {
        deleted_branches: deleted_branch_infos,
    })
}

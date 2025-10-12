use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseState;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListSelectedBranchesInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListSelectedBranchesOutput {
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateSelectedBranchesInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateSelectedBranchesOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteSelectedBranchesInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteSelectedBranchesOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllSelectedBranchesInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllSelectedBranchesOutput {}

/// Lists all selected branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<ListSelectedBranchesOutput, AppError>` - The selected branches or an error
#[tauri::command]
#[specta::specta]
pub fn list_selected_branches(
    db: State<'_, DatabaseState>,
    input: ListSelectedBranchesInput,
) -> Result<ListSelectedBranchesOutput, AppError> {
    let branches =
        super::super::services::selected_branches::get_selected_branches(&db, &input.repo_id)?;
    Ok(ListSelectedBranchesOutput { branches })
}

/// Creates multiple selected branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchCreateSelectedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_create_selected_branches(
    db: State<'_, DatabaseState>,
    input: BatchCreateSelectedBranchesInput,
) -> Result<BatchCreateSelectedBranchesOutput, AppError> {
    super::super::services::selected_branches::add_selected_branches(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchCreateSelectedBranchesOutput {})
}

/// Deletes multiple selected branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchDeleteSelectedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_delete_selected_branches(
    db: State<'_, DatabaseState>,
    input: BatchDeleteSelectedBranchesInput,
) -> Result<BatchDeleteSelectedBranchesOutput, AppError> {
    super::super::services::selected_branches::remove_selected_branches(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchDeleteSelectedBranchesOutput {})
}

/// Deletes all selected branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<DeleteAllSelectedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn delete_all_selected_branches(
    db: State<'_, DatabaseState>,
    input: DeleteAllSelectedBranchesInput,
) -> Result<DeleteAllSelectedBranchesOutput, AppError> {
    super::super::services::selected_branches::clear_selected_branches(&db, &input.repo_id)?;
    Ok(DeleteAllSelectedBranchesOutput {})
}

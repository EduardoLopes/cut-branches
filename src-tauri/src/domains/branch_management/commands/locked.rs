use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseState;
use crate::shared::error::AppError;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListLockedBranchesInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListLockedBranchesOutput {
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateLockedBranchesInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateLockedBranchesOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteLockedBranchesInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteLockedBranchesOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllLockedBranchesInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllLockedBranchesOutput {}

/// Lists all locked branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<ListLockedBranchesOutput, AppError>` - The locked branches or an error
#[tauri::command]
#[specta::specta]
pub fn list_locked_branches(
    db: State<'_, DatabaseState>,
    input: ListLockedBranchesInput,
) -> Result<ListLockedBranchesOutput, AppError> {
    let branches =
        super::super::core::application::locked_branches::get_locked_branches(&db, &input.repo_id)?;
    Ok(ListLockedBranchesOutput { branches })
}

/// Creates multiple locked branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchCreateLockedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_create_locked_branches(
    db: State<'_, DatabaseState>,
    input: BatchCreateLockedBranchesInput,
) -> Result<BatchCreateLockedBranchesOutput, AppError> {
    super::super::core::application::locked_branches::add_locked_branches(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchCreateLockedBranchesOutput {})
}

/// Deletes multiple locked branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchDeleteLockedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_delete_locked_branches(
    db: State<'_, DatabaseState>,
    input: BatchDeleteLockedBranchesInput,
) -> Result<BatchDeleteLockedBranchesOutput, AppError> {
    super::super::core::application::locked_branches::remove_locked_branches(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchDeleteLockedBranchesOutput {})
}

/// Deletes all locked branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<DeleteAllLockedBranchesOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn delete_all_locked_branches(
    db: State<'_, DatabaseState>,
    input: DeleteAllLockedBranchesInput,
) -> Result<DeleteAllLockedBranchesOutput, AppError> {
    super::super::core::application::locked_branches::clear_locked_branches(&db, &input.repo_id)?;
    Ok(DeleteAllLockedBranchesOutput {})
}

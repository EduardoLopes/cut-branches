use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseState;
use crate::shared::error::AppError;

// Default (active branches) operations

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchSelectionInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchSelectionOutput {
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateBranchSelectionInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateBranchSelectionOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBranchSelectionInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBranchSelectionOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllBranchSelectionInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllBranchSelectionOutput {}

/// Lists all selected branches for a repository (active branches only).
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<ListBranchSelectionOutput, AppError>` - The selected branches or an error
#[tauri::command]
#[specta::specta]
pub fn list_branch_selection(
    db: State<'_, DatabaseState>,
    input: ListBranchSelectionInput,
) -> Result<ListBranchSelectionOutput, AppError> {
    let branches =
        super::super::services::selected_branches::get_branch_selection_list(&db, &input.repo_id)?;
    Ok(ListBranchSelectionOutput { branches })
}

/// Creates multiple selected branches for a repository (active branches).
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchCreateBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_create_branch_selection(
    db: State<'_, DatabaseState>,
    input: BatchCreateBranchSelectionInput,
) -> Result<BatchCreateBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::add_branch_selection_batch(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchCreateBranchSelectionOutput {})
}

/// Deletes multiple selected branches for a repository (active branches).
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchDeleteBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_delete_branch_selection(
    db: State<'_, DatabaseState>,
    input: BatchDeleteBranchSelectionInput,
) -> Result<BatchDeleteBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::remove_branch_selection_batch(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchDeleteBranchSelectionOutput {})
}

/// Deletes all selected branches for a repository (active branches).
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<DeleteAllBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn delete_all_branch_selection(
    db: State<'_, DatabaseState>,
    input: DeleteAllBranchSelectionInput,
) -> Result<DeleteAllBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::clear_branch_selection(&db, &input.repo_id)?;
    Ok(DeleteAllBranchSelectionOutput {})
}

// Deleted branches (restoration) operations

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListDeletedBranchSelectionInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListDeletedBranchSelectionOutput {
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateDeletedBranchSelectionInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateDeletedBranchSelectionOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteDeletedBranchSelectionInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteDeletedBranchSelectionOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllDeletedBranchSelectionInput {
    pub repo_id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAllDeletedBranchSelectionOutput {}

/// Lists all selected deleted branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<ListDeletedBranchSelectionOutput, AppError>` - The selected deleted branches or an error
#[tauri::command]
#[specta::specta]
pub fn list_deleted_branch_selection(
    db: State<'_, DatabaseState>,
    input: ListDeletedBranchSelectionInput,
) -> Result<ListDeletedBranchSelectionOutput, AppError> {
    let branches =
        super::super::services::selected_branches::get_deleted_branch_selection_list(
            &db,
            &input.repo_id,
        )?;
    Ok(ListDeletedBranchSelectionOutput { branches })
}

/// Creates multiple selected deleted branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchCreateDeletedBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_create_deleted_branch_selection(
    db: State<'_, DatabaseState>,
    input: BatchCreateDeletedBranchSelectionInput,
) -> Result<BatchCreateDeletedBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::add_deleted_branch_selection_batch(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchCreateDeletedBranchSelectionOutput {})
}

/// Deletes multiple selected deleted branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID and branch names
///
/// # Returns
///
/// * `Result<BatchDeleteDeletedBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn batch_delete_deleted_branch_selection(
    db: State<'_, DatabaseState>,
    input: BatchDeleteDeletedBranchSelectionInput,
) -> Result<BatchDeleteDeletedBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::remove_deleted_branch_selection_batch(
        &db,
        &input.repo_id,
        input.branch_names,
    )?;
    Ok(BatchDeleteDeletedBranchSelectionOutput {})
}

/// Deletes all selected deleted branches for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID
///
/// # Returns
///
/// * `Result<DeleteAllDeletedBranchSelectionOutput, AppError>` - Success or an error
#[tauri::command]
#[specta::specta]
pub fn delete_all_deleted_branch_selection(
    db: State<'_, DatabaseState>,
    input: DeleteAllDeletedBranchSelectionInput,
) -> Result<DeleteAllDeletedBranchSelectionOutput, AppError> {
    super::super::services::selected_branches::clear_deleted_branch_selection(
        &db,
        &input.repo_id,
    )?;
    Ok(DeleteAllDeletedBranchSelectionOutput {})
}

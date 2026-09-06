use serde::{Deserialize, Serialize};
use tauri::State;

use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;

// Helper function for default true values
fn default_true() -> bool {
    true
}

// Unified selection commands

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBranchSelectionBatchInput {
    pub repo_id: String,
    pub branch_names: Vec<String>,
    pub is_selected: bool,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBranchSelectionBatchOutput {}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SetBranchSelectionAllInput {
    pub repo_id: String,
    pub is_selected: bool,
    pub deletion_status: super::super::filters::DeletionStatusFilter,
    #[serde(default = "default_true")]
    pub exclude_locked: bool,
    #[serde(default = "default_true")]
    pub exclude_current: bool,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SetBranchSelectionAllOutput {}

/// Updates selection status for specific branches.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID, branch names, and selection status
///
/// # Returns
///
/// * `Result<UpdateBranchSelectionBatchOutput, AppError>` - Success or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn update_branch_selection_batch(
    db: State<'_, DatabaseState>,
    input: UpdateBranchSelectionBatchInput,
) -> Result<UpdateBranchSelectionBatchOutput, AppError> {
    let mut conn = db.connection()?;
    super::super::core::application::selected_branches::update_branch_selection_batch(
        &mut conn,
        &input.repo_id,
        input.branch_names,
        input.is_selected,
    )?;
    Ok(UpdateBranchSelectionBatchOutput {})
}

/// Sets all branches to selected/unselected based on deletion status filter.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repository ID, selection status, deletion status filter, and exclusion flags
///
/// # Returns
///
/// * `Result<SetBranchSelectionAllOutput, AppError>` - Success or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn set_branch_selection_all(
    db: State<'_, DatabaseState>,
    input: SetBranchSelectionAllInput,
) -> Result<SetBranchSelectionAllOutput, AppError> {
    let mut conn = db.connection()?;
    super::super::core::application::selected_branches::set_branch_selection_all(
        &mut conn,
        &input.repo_id,
        input.is_selected,
        input.deletion_status,
        input.exclude_locked,
        input.exclude_current,
    )?;
    Ok(SetBranchSelectionAllOutput {})
}

// Query commands for getting selected branches

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
#[tauri::command(async)]
#[specta::specta]
pub async fn list_branch_selection(
    db: State<'_, DatabaseState>,
    input: ListBranchSelectionInput,
) -> Result<ListBranchSelectionOutput, AppError> {
    let mut conn = db.connection()?;
    let branches = super::super::core::application::selected_branches::get_branch_selection_list(
        &mut conn,
        &input.repo_id,
    )?;
    Ok(ListBranchSelectionOutput { branches })
}

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
#[tauri::command(async)]
#[specta::specta]
pub async fn list_deleted_branch_selection(
    db: State<'_, DatabaseState>,
    input: ListDeletedBranchSelectionInput,
) -> Result<ListDeletedBranchSelectionOutput, AppError> {
    let mut conn = db.connection()?;
    let branches =
        super::super::core::application::selected_branches::get_deleted_branch_selection_list(
            &mut conn,
            &input.repo_id,
        )?;
    Ok(ListDeletedBranchSelectionOutput { branches })
}

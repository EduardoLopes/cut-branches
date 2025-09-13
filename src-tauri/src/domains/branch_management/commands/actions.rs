use std::path::Path;

use super::super::services::deletion::{DeletedBranch, RestoreBranchResult};
use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SwitchBranchInput {
    pub path: String,
    pub branch: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SwitchBranchOutput {
    pub current_branch: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchInput {
    pub path: String,
    pub branch_info: DeletedBranch,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchOutput {
    pub result: RestoreBranchResult,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchesInput {
    pub path: String,
    pub branch_infos: Vec<DeletedBranch>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchesOutput {
    pub results: Vec<RestoreBranchResult>,
}

/// Restores a deleted branch in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `input` - Input parameters containing path and branch info
///
/// # Returns
///
/// * `Result<RestoreBranchOutput, AppError>` - The restoration result or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_branch(
    app: tauri::AppHandle,
    input: RestoreBranchInput,
) -> Result<RestoreBranchOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let result = super::super::services::restoration::restore_deleted_branch(
        raw_path,
        &input.branch_info,
        Some(&app),
    )?;

    Ok(RestoreBranchOutput { result })
}

/// Restores multiple deleted branches in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `input` - Input parameters containing path and branch infos
///
/// # Returns
///
/// * `Result<RestoreBranchesOutput, AppError>` - The restoration results or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_branches(
    app: tauri::AppHandle,
    input: RestoreBranchesInput,
) -> Result<RestoreBranchesOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let results = super::super::services::restoration::restore_deleted_branches(
        raw_path,
        &input.branch_infos,
        Some(&app),
    )?;

    Ok(RestoreBranchesOutput { results })
}

/// Switches to another branch in a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch name
///
/// # Returns
///
/// * `Result<SwitchBranchOutput, AppError>` - The new current branch name or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn switch_branch(input: SwitchBranchInput) -> Result<SwitchBranchOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let current_branch = super::super::services::switching::switch_branch(raw_path, &input.branch)?;

    Ok(SwitchBranchOutput { current_branch })
}

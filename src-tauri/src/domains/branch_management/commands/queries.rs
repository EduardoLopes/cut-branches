use std::path::Path;

use crate::db::DatabaseState;
use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetCommitReachabilityInput {
    pub path: String,
    pub commit_sha: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetCommitReachabilityOutput {
    pub is_reachable: bool,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchListInput {
    pub repo_id: String,
    #[serde(default)]
    pub filters: crate::domains::branch_management::filters::BranchFilters,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchListOutput {
    pub branches: Vec<crate::domains::branch_management::git::branch::Branch>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchMergeStatusInput {
    pub path: String,
    pub branch_name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchMergeStatusOutput {
    pub is_merged: bool,
}

/// Gets the reachability status of a commit SHA in a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and commit SHA
///
/// # Returns
///
/// * `Result<GetCommitReachabilityOutput, AppError>` - The reachability status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_commit_reachability(
    input: GetCommitReachabilityInput,
) -> Result<GetCommitReachabilityOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let is_reachable = super::super::git::commit::is_commit_reachable(raw_path, &input.commit_sha)?;

    Ok(GetCommitReachabilityOutput { is_reachable })
}

/// Gets branches from the database for a repository with optional filtering.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repo_id and optional filters
///
/// # Returns
///
/// * `Result<GetBranchListOutput, AppError>` - The list of branches or an error
#[tauri::command]
#[specta::specta]
pub fn get_branch_list(
    db: State<DatabaseState>,
    input: GetBranchListInput,
) -> Result<GetBranchListOutput, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let branch_records = crate::db::operations::get_branches_for_repository(
        &mut conn,
        &input.repo_id,
        &input.filters,
    )
    .map_err(|e| {
        AppError::new(
            "Failed to get branches from database".to_string(),
            "db_query_failed",
            Some(e.to_string()),
        )
    })?;

    // Convert BranchRecord to Branch
    let branches: Vec<crate::domains::branch_management::git::branch::Branch> = branch_records
        .into_iter()
        .map(crate::domains::branch_management::git::branch::Branch::from)
        .collect();

    Ok(GetBranchListOutput { branches })
}

/// Gets the merge status of a branch in a git repository.
/// Checks if the specified branch is fully merged into HEAD.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch name
///
/// # Returns
///
/// * `Result<GetBranchMergeStatusOutput, AppError>` - The merge status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_branch_merge_status(
    input: GetBranchMergeStatusInput,
) -> Result<GetBranchMergeStatusOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let is_merged =
        super::super::git::branch::check_branch_merge_status(raw_path, &input.branch_name)?;

    Ok(GetBranchMergeStatusOutput { is_merged })
}

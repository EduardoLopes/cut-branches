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
pub struct ListBranchesInput {
    pub repo_id: String,
    pub include_deleted: bool,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchesOutput {
    pub branches: Vec<crate::domains::branch_management::git::branch::Branch>,
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

/// Lists branches from the database for a repository.
///
/// # Arguments
///
/// * `db` - Database state
/// * `input` - Input parameters containing repo_id and include_deleted flag
///
/// # Returns
///
/// * `Result<ListBranchesOutput, AppError>` - The list of branches or an error
#[tauri::command]
#[specta::specta]
pub fn list_branches(
    db: State<DatabaseState>,
    input: ListBranchesInput,
) -> Result<ListBranchesOutput, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let branch_records = if input.include_deleted {
        crate::db::operations::get_deleted_branches_for_repository(&mut conn, &input.repo_id)
    } else {
        crate::db::operations::get_branches_for_repository(&mut conn, &input.repo_id)
    }
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

    Ok(ListBranchesOutput { branches })
}

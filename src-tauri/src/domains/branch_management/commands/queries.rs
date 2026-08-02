use std::path::Path;

use crate::domains::branch_management::core::models::branch_name::BranchName;
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;
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
    pub branches: Vec<crate::shared::kernel::branch::Branch>,
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

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BulkGetBranchMetricsInput {
    pub path: String,
    pub branch_names: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BranchMetrics {
    pub name: String,
    pub is_merged: bool,
    pub lines_added: u32,
    pub lines_removed: u32,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BulkGetBranchMetricsOutput {
    pub metrics: Vec<BranchMetrics>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchDiffStatsInput {
    pub path: String,
    pub branch_name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchDiffStatsOutput {
    pub lines_added: u32,
    pub lines_removed: u32,
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
    // Validate the SHA at the boundary (§1.2); downstream git ops get a
    // normalized, checked value.
    let commit_sha = CommitSha::new(&input.commit_sha)?;
    let raw_path = Path::new(&input.path);
    let is_reachable =
        crate::domains::branch_management::infrastructure::git::commit::is_commit_reachable(
            raw_path,
            commit_sha.as_str(),
        )?;

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
#[tauri::command(async)]
#[specta::specta]
pub async fn get_branch_list(
    db: State<'_, DatabaseState>,
    input: GetBranchListInput,
) -> Result<GetBranchListOutput, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let branch_records =
        crate::domains::branch_management::infrastructure::repositories::get_branches_for_repository(
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
    let branches: Vec<crate::shared::kernel::branch::Branch> = branch_records
        .into_iter()
        .map(crate::shared::kernel::branch::Branch::from)
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
    // Validate the branch name at the boundary (§1.2).
    let branch_name = BranchName::new(input.branch_name)?;
    let raw_path = Path::new(&input.path);
    let is_merged =
        crate::domains::branch_management::infrastructure::git::branch::check_branch_merge_status(
            raw_path,
            branch_name.as_str(),
        )?;

    Ok(GetBranchMergeStatusOutput { is_merged })
}

/// Gets the line-level diff stats of a branch in a git repository: lines
/// added/removed relative to the branch's merge-base with HEAD.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch name
///
/// # Returns
///
/// * `Result<GetBranchDiffStatsOutput, AppError>` - The diff stats or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn get_branch_diff_stats(
    input: GetBranchDiffStatsInput,
) -> Result<GetBranchDiffStatsOutput, AppError> {
    // Validate the branch name at the boundary (§1.2).
    let branch_name = BranchName::new(input.branch_name)?;
    let raw_path = Path::new(&input.path);
    let (lines_added, lines_removed) =
        crate::domains::branch_management::infrastructure::git::branch::get_branch_diff_stats(
            raw_path,
            branch_name.as_str(),
        )?;

    Ok(GetBranchDiffStatsOutput {
        // Line counts never approach 2^32; saturate rather than wrap on the
        // pathological case so the contract can stay a plain `number`.
        lines_added: u32::try_from(lines_added).unwrap_or(u32::MAX),
        lines_removed: u32::try_from(lines_removed).unwrap_or(u32::MAX),
    })
}

/// Gets merge status and diff stats for a batch of branches in one call,
/// served from the persistent `(HEAD sha, branch sha)` cache with only the
/// misses computed (in parallel). Branches that fail to resolve are omitted
/// from the output rather than failing the batch.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch names
///
/// # Returns
///
/// * `Result<BulkGetBranchMetricsOutput, AppError>` - Metrics per resolved branch or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn bulk_get_branch_metrics(
    db: State<'_, crate::shared::infrastructure::db::DatabaseState>,
    input: BulkGetBranchMetricsInput,
) -> Result<BulkGetBranchMetricsOutput, AppError> {
    // Validate every branch name at the boundary (§1.2).
    let branch_names = input
        .branch_names
        .into_iter()
        .map(BranchName::new)
        .collect::<Result<Vec<_>, _>>()?;
    let names: Vec<String> = branch_names
        .into_iter()
        .map(|b| b.as_str().to_string())
        .collect();

    let raw_path = Path::new(&input.path);
    let mut conn = db.connection()?;
    let records =
        crate::domains::branch_management::core::application::branch_metrics::bulk_get_branch_metrics_cached(
            raw_path, &names, &mut conn,
        )?;

    Ok(BulkGetBranchMetricsOutput {
        metrics: records
            .into_iter()
            .map(|r| BranchMetrics {
                name: r.name,
                is_merged: r.is_merged,
                lines_added: u32::try_from(r.lines_added).unwrap_or(u32::MAX),
                lines_removed: u32::try_from(r.lines_removed).unwrap_or(u32::MAX),
            })
            .collect(),
    })
}

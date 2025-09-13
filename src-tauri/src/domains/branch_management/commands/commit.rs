use std::path::Path;

use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitReachabilityResponse {
    #[serde(rename = "isReachable")]
    pub is_reachable: bool,
}

/// Command to check if a commit SHA is reachable in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `commit_sha` - The commit SHA to check
///
/// # Returns
///
/// * `Result<CommitReachabilityResponse, AppError>` - The reachability status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn is_commit_reachable(path: String, commit_sha: String) -> Result<CommitReachabilityResponse, AppError> {
    let raw_path = Path::new(&path);
    let is_reachable = super::super::git::commit::is_commit_reachable(raw_path, &commit_sha)?;

    Ok(CommitReachabilityResponse { is_reachable })
}
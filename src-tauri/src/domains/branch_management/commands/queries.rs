use std::path::Path;

use crate::shared::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IsCommitReachableInput {
    pub path: String,
    pub commit_sha: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IsCommitReachableOutput {
    pub is_reachable: bool,
}

/// Checks if a commit SHA is reachable in a git repository.
///
/// # Arguments
///
/// * `input` - Input parameters containing path and commit SHA
///
/// # Returns
///
/// * `Result<IsCommitReachableOutput, AppError>` - The reachability status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn is_commit_reachable(
    input: IsCommitReachableInput,
) -> Result<IsCommitReachableOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let is_reachable = super::super::git::commit::is_commit_reachable(raw_path, &input.commit_sha)?;

    Ok(IsCommitReachableOutput { is_reachable })
}

use std::path::Path;

use crate::shared::error::AppError;

/// Command to check if a commit SHA is reachable in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `commit_sha` - The commit SHA to check
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the reachability status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn is_commit_reachable(path: String, commit_sha: String) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let is_reachable = super::super::git::commit::is_commit_reachable(raw_path, &commit_sha)?;

    let response = serde_json::json!({ "is_reachable": is_reachable });

    serde_json::to_string(&response).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })
}
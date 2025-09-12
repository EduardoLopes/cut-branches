use std::path::Path;

use crate::error::Error;

/// Command to check if a commit SHA is reachable in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `commit_sha` - The commit SHA to check
///
/// # Returns
///
/// * `Result<String, Error>` - A JSON string with the reachability status or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn is_commit_reachable(path: String, commit_sha: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    let is_reachable = crate::git::is_commit_reachable(raw_path, &commit_sha)?;

    let response = serde_json::json!({ "is_reachable": is_reachable });

    serde_json::to_string(&response).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[tokio::test]
    async fn test_is_commit_reachable_command_detail() {
        let _guard = DirectoryGuard::new();

        // Setup test repository
        let repo = setup_test_repo();
        let path = repo.path();

        // Get the current commit hash
        let commit_hash = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(commit_hash.stdout)
            .unwrap()
            .trim()
            .to_string();

        // Get the path as string
        let path_str = path.to_str().unwrap().to_string();

        // Test is_commit_reachable with valid commit
        let result = is_commit_reachable(path_str.clone(), commit_sha.clone()).await;

        assert!(
            result.is_ok(),
            "is_commit_reachable should succeed for valid commit"
        );
        let result_json: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(
            result_json["is_reachable"].as_bool().unwrap(),
            "Valid commit should be reachable"
        );

        // Test with invalid commit
        let result = is_commit_reachable(
            path_str.clone(),
            "0000000000000000000000000000000000000000".to_string(),
        )
        .await;

        assert!(
            result.is_ok(),
            "is_commit_reachable should succeed for invalid commit"
        );
        let result_json: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(
            !result_json["is_reachable"].as_bool().unwrap(),
            "Invalid commit should not be reachable"
        );
    }
}

use std::path::Path;

use crate::error::Error;
use crate::git::GitDirResponse;
use crate::path::RootPathResponse;

/// Command to get information about a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
///
/// # Returns
///
/// * `Result<String, Error>` - A JSON string with repository information or an error
#[tauri::command(async)]
pub async fn get_repo_info(path: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    if !crate::path::is_git_repository(raw_path)? {
        return Err(Error::new(
            format!(
                "The folder **{}** is not a git repository",
                raw_path
                    .file_name()
                    .unwrap_or_else(|| raw_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            Some(format!(
                "The path **{}** does not contain a .git directory",
                raw_path.display()
            )),
        ));
    }

    let unserialized_root_path: String = crate::path::get_root(path.clone()).await?;

    let root_path = serde_json::from_str::<RootPathResponse>(&unserialized_root_path)
        .map_err(|e| {
            Error::new(
                format!("Failed to parse root path response: {}", e),
                "parse_failed",
                Some(format!("Error parsing root path JSON: {}", e)),
            )
        })?
        .root_path;

    let raw_root_path = Path::new(&root_path);

    let mut branches = crate::git::get_all_branches_with_last_commit(raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current = crate::git::get_current_branch(raw_root_path)?;

    let repo_name = raw_root_path
        .file_name()
        .ok_or_else(|| {
            Error::new(
                "Failed to get repository name".to_string(),
                "repo_name_failed",
                Some("Could not extract the repository name from the file path".to_string()),
            )
        })?
        .to_str()
        .ok_or_else(|| {
            Error::new(
                "Failed to convert repository name to string".to_string(),
                "repo_name_failed",
                Some("Repository name contains invalid UTF-8 characters".to_string()),
            )
        })?
        .to_string();
    let branches_count = branches.len();

    let response = GitDirResponse {
        path: root_path,
        branches,
        current_branch: current.to_string(),
        branches_count,
        name: repo_name.clone(),
        id: repo_name,
    };

    Ok(serde_json::to_string(&response).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })?)
}

/// Command to switch to another branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch` - The branch name to switch to
///
/// # Returns
///
/// * `Result<String, Error>` - The new current branch name or an error
#[tauri::command(async)]
pub async fn switch_branch(path: String, branch: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    crate::git::switch_branch(raw_path, &branch)
}

/// Command to delete branches from a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branches` - List of branch names to delete
///
/// # Returns
///
/// * `Result<String, Error>` - A JSON string with the deleted branches or an error
#[tauri::command(async)]
pub async fn delete_branches(path: String, branches: Vec<String>) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    let deleted_branch_infos: Vec<crate::git::DeletedBranchInfo> =
        crate::git::delete_branches(raw_path, &branches)?;

    Ok(serde_json::to_string(&deleted_branch_infos).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the deleted branches information to JSON: {}",
                e
            )),
        )
    })?)
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
/// * `Result<String, Error>` - A JSON string with the reachability status or an error
#[tauri::command(async)]
pub async fn is_commit_reachable(path: String, commit_sha: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    let is_reachable = crate::git::is_commit_reachable(raw_path, &commit_sha)?;

    let response = serde_json::json!({ "is_reachable": is_reachable });

    Ok(serde_json::to_string(&response).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })?)
}

/// Command to restore a deleted branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch_info` - Information about the branch to restore
///
/// # Returns
///
/// * `Result<String, Error>` - A JSON string with the restoration result or an error
#[tauri::command(async)]
pub async fn restore_deleted_branch(
    path: String,
    branch_info: crate::git::RestoreBranchInput,
) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    let result = crate::git::restore_deleted_branch(raw_path, &branch_info)?;

    Ok(serde_json::to_string(&result).map_err(|e| {
        Error::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!("Error converting to JSON: {}", e)),
        )
    })?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[tokio::test]
    async fn test_get_repo_info() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .expect(&format!("Failed to set current directory to {:?}", path));
        let path_str = path.to_str().unwrap().to_string();
        let result = get_repo_info(path_str).await;
        assert!(result.is_ok(), "get_repo_info failed: {:?}", result.err());
        let response_str = result.unwrap();
        let response: GitDirResponse = serde_json::from_str(&response_str).unwrap();
        assert_eq!(response.branches_count, 1, "Expected 1 branch");
        assert!(!response.branches.is_empty(), "No branches returned");
        assert!(!response.current_branch.is_empty(), "No current branch");
        assert!(
            response.branches[0].current,
            "First branch should be current"
        );
        let branch = &response.branches[0];
        assert!(!branch.name.is_empty(), "Branch has no name");
        assert!(!branch.last_commit.sha.is_empty(), "No commit SHA");
        assert!(!branch.last_commit.message.is_empty(), "No commit message");
        assert_eq!(
            branch.last_commit.message, "Initial commit",
            "Unexpected commit message"
        );
        assert_eq!(branch.last_commit.author, "Test User", "Unexpected author");
        let expected_email = "test@example.com";
        let mut actual_email = branch.last_commit.email.clone();
        if actual_email.starts_with('<') && actual_email.ends_with('>') {
            actual_email = actual_email
                .trim_start_matches('<')
                .trim_end_matches('>')
                .to_string();
        }
        assert_eq!(
            actual_email, expected_email,
            "Unexpected email. Expected: {}, Got: {}",
            expected_email, actual_email
        );
    }

    #[tokio::test]
    async fn test_switch_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .expect(&format!("Failed to set current directory to {:?}", path));
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        println!("Current branch is: {}", current_branch);
        println!("Creating test-branch...");
        let create_output = Command::new("git")
            .args(["checkout", "-b", "test-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(
            create_output.status.success(),
            "Failed to create test branch: {}",
            String::from_utf8_lossy(&create_output.stderr)
        );
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        assert_eq!(branch, "test-branch", "Failed to checkout test-branch");
        let path_str = path.to_str().unwrap().to_string();
        println!("Switching to original branch: {}", current_branch);
        let result = switch_branch(path_str.clone(), current_branch.clone()).await;
        assert!(result.is_ok(), "Failed to switch back: {:?}", result.err());
        assert_eq!(result.unwrap(), current_branch);
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        assert_eq!(
            branch, current_branch,
            "Failed to switch to original branch"
        );
        println!("Switching to test-branch with command function...");
        let result = switch_branch(path_str, "test-branch".to_string()).await;
        assert!(
            result.is_ok(),
            "Failed to switch branch: {:?}",
            result.err()
        );
        assert_eq!(result.unwrap(), "test-branch");
    }

    #[tokio::test]
    async fn test_delete_branches() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .expect(&format!("Failed to set current directory to {:?}", path));
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        println!("Current branch is: {}", current_branch);
        println!("Creating branch-to-delete...");
        let create_output = Command::new("git")
            .args(["checkout", "-b", "branch-to-delete"])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(
            create_output.status.success(),
            "Failed to create branch-to-delete: {}",
            String::from_utf8_lossy(&create_output.stderr)
        );
        println!("Switching back to original branch: {}", current_branch);
        let checkout_output = Command::new("git")
            .args(["checkout", &current_branch])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(
            checkout_output.status.success(),
            "Failed to checkout original branch: {}",
            String::from_utf8_lossy(&checkout_output.stderr)
        );
        let output = Command::new("git")
            .args(["branch"])
            .current_dir(path)
            .output()
            .unwrap();
        let branches_output = String::from_utf8(output.stdout).unwrap();
        assert!(
            branches_output.contains("branch-to-delete"),
            "Branch to delete not found in git branch output: {}",
            branches_output
        );
        let path_str = path.to_str().unwrap().to_string();
        let branches_to_delete = vec!["branch-to-delete".to_string()];
        let result = delete_branches(path_str, branches_to_delete).await;
        assert!(
            result.is_ok(),
            "Failed to delete branch: {:?}",
            result.err()
        );
        let deleted_branches: Vec<crate::git::DeletedBranchInfo> =
            serde_json::from_str(&result.unwrap()).unwrap();
        assert!(!deleted_branches.is_empty(), "No branches were deleted");
        assert_eq!(
            deleted_branches[0].branch.name, "branch-to-delete",
            "Expected branch-to-delete to be deleted"
        );
        let output = Command::new("git")
            .args(["branch"])
            .current_dir(path)
            .output()
            .unwrap();
        let branches_output_after_delete = String::from_utf8(output.stdout).unwrap();
        assert!(
            !branches_output_after_delete.contains("branch-to-delete"),
            "Branch still exists after deletion: {}",
            branches_output_after_delete
        );
    }

    #[tokio::test]
    async fn test_is_commit_reachable_command() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Get the current commit hash
        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let path_str = path.to_str().unwrap().to_string();

        // Test with a valid commit SHA
        let result = is_commit_reachable(path_str.clone(), commit_sha).await;
        assert!(
            result.is_ok(),
            "is_commit_reachable command failed: {:?}",
            result.err()
        );
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(
            response["is_reachable"].as_bool().unwrap(),
            "The current HEAD commit should be reachable"
        );

        // Test with an invalid commit SHA
        let invalid_sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef".to_string();
        let result = is_commit_reachable(path_str, invalid_sha).await;
        assert!(result.is_ok());
        let response: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(
            !response["is_reachable"].as_bool().unwrap(),
            "A non-existent commit should not be reachable"
        );
    }

    #[tokio::test]
    async fn test_restore_deleted_branch_command() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Get the current commit hash
        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Create a test branch to delete
        let _ = Command::new("git")
            .args(["branch", "test-branch-to-restore"])
            .current_dir(path)
            .output()
            .unwrap();

        // Delete the branch
        let _ = Command::new("git")
            .args(["branch", "-D", "test-branch-to-restore"])
            .current_dir(path)
            .output()
            .unwrap();

        // Verify the branch is gone
        let branch_check = Command::new("git")
            .args(["show-ref", "--verify", "refs/heads/test-branch-to-restore"])
            .current_dir(path)
            .status()
            .unwrap();
        assert!(
            !branch_check.success(),
            "Branch should not exist before restoration"
        );

        // Create branch_info for restoration
        let branch_info = crate::git::RestoreBranchInput {
            original_name: "test-branch-to-restore".to_string(),
            target_name: "test-branch-to-restore".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let path_str = path.to_str().unwrap().to_string();

        // Test the command
        let result = restore_deleted_branch(path_str, branch_info).await;
        assert!(
            result.is_ok(),
            "restore_deleted_branch command failed: {:?}",
            result.err()
        );

        // Parse the result
        let result_json: crate::git::RestoreBranchResult =
            serde_json::from_str(&result.unwrap()).unwrap();
        assert!(
            result_json.success,
            "Branch restoration should be successful"
        );
        assert_eq!(result_json.branch_name, "test-branch-to-restore");

        // Verify the branch now exists
        let branch_check = Command::new("git")
            .args(["show-ref", "--verify", "refs/heads/test-branch-to-restore"])
            .current_dir(path)
            .status()
            .unwrap();
        assert!(
            branch_check.success(),
            "Branch should exist after restoration"
        );
    }
}

use std::path::Path;

use crate::error::AppError;

/// Command to switch to another branch in a git repository.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch` - The branch name to switch to
///
/// # Returns
///
/// * `Result<String, AppError>` - The new current branch name or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn switch_branch(path: String, branch: String) -> Result<String, AppError> {
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
/// * `Result<String, AppError>` - A JSON string with the deleted branches or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn delete_branches(path: String, branches: Vec<String>) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let deleted_branch_infos: Vec<crate::git::DeletedBranchInfo> =
        crate::git::delete_branches(raw_path, &branches)?;

    serde_json::to_string(&deleted_branch_infos).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the deleted branches information to JSON: {}",
                e
            )),
        )
    })
}

/// Command to restore a deleted branch in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `path` - Path to the git repository
/// * `branch_info` - Information about the branch to restore
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the restoration result or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branch(
    app: tauri::AppHandle,
    path: String,
    branch_info: crate::git::RestoreBranchInput,
) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let result = crate::git::restore_deleted_branch(raw_path, &branch_info, Some(&app))?;
    serde_json::to_string(&result).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the restoration result to JSON: {}",
                e
            )),
        )
    })
}

/// Command to restore multiple deleted branches in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `path` - Path to the git repository
/// * `branch_infos` - Information about the branches to restore
///
/// # Returns
///
/// * `Result<String, AppError>` - A JSON string with the restoration results or an error
#[tauri::command]
#[specta::specta]
pub async fn restore_deleted_branches(
    app: tauri::AppHandle,
    path: String,
    branch_infos: Vec<crate::git::RestoreBranchInput>,
) -> Result<String, AppError> {
    let raw_path = Path::new(&path);
    let results = crate::git::restore_deleted_branches(raw_path, &branch_infos, Some(&app))?;
    serde_json::to_string(&results).map_err(|e| {
        AppError::new(
            format!("Failed to serialize response: {}", e),
            "serialization_failed",
            Some(format!(
                "Error converting the restoration results to JSON: {}",
                e
            )),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[tokio::test]
    async fn test_switch_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        std::env::set_current_dir(path)
            .unwrap_or_else(|_| panic!("Failed to set current directory to {:?}", path));
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
            .unwrap_or_else(|_| panic!("Failed to set current directory to {:?}", path));
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

    /*
    #[tokio::test]
    async fn test_restore_deleted_branch_command_detail() {
        // This test is commented out because AppHandle cannot be constructed in a test context.
        // See Tauri documentation for details on AppHandle and testing.
    }
    */

    #[tokio::test]
    async fn test_switch_branch_command() {
        let _guard = DirectoryGuard::new();

        // Setup test repository
        let repo = setup_test_repo();
        let path = repo.path();

        // Create a new branch for testing
        assert!(Command::new("git")
            .args(["branch", "test-switch-branch"])
            .current_dir(path)
            .status()
            .unwrap()
            .success());

        // Get the path as string
        let path_str = path.to_str().unwrap().to_string();

        // Test switch_branch command with the new branch
        let result = switch_branch(path_str.clone(), "test-switch-branch".to_string()).await;

        assert!(result.is_ok(), "switch_branch should succeed");

        // Verify we're on the new branch
        let current_branch_output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(current_branch_output.stdout)
            .unwrap()
            .trim()
            .to_string();
        assert_eq!(
            current_branch, "test-switch-branch",
            "Should be on test branch"
        );

        // Test switching to a non-existent branch
        let result = switch_branch(path_str.clone(), "non-existent-branch".to_string()).await;

        assert!(
            result.is_err(),
            "switch_branch should fail for non-existent branch"
        );
        if let Err(e) = result {
            assert_eq!(e.kind, "branch_not_found", "Wrong error kind");
        }
    }

    #[tokio::test]
    async fn test_delete_branches_command() {
        let _guard = DirectoryGuard::new();

        // Setup test repository
        let repo = setup_test_repo();
        let path = repo.path();

        // Create branches for testing
        for branch_name in ["test-delete-1", "test-delete-2", "test-delete-3"].iter() {
            assert!(Command::new("git")
                .args(["branch", branch_name])
                .current_dir(path)
                .status()
                .unwrap()
                .success());
        }

        // Get the path as string
        let path_str = path.to_str().unwrap().to_string();

        // Test delete_branches command with valid branches
        let result = delete_branches(
            path_str.clone(),
            vec!["test-delete-1".to_string(), "test-delete-2".to_string()],
        )
        .await;

        assert!(
            result.is_ok(),
            "delete_branches should succeed for valid branches"
        );
        let deleted_info_json_str = result.unwrap();
        let deleted_info_vec: Vec<crate::git::DeletedBranchInfo> =
            serde_json::from_str(&deleted_info_json_str).unwrap();
        assert_eq!(deleted_info_vec.len(), 2, "Should have deleted 2 branches");

        // Verify branches were deleted
        let branches_output = Command::new("git")
            .args(["branch"])
            .current_dir(path)
            .output()
            .unwrap();
        let branches_list = String::from_utf8(branches_output.stdout).unwrap();
        assert!(
            !branches_list.contains("test-delete-1"),
            "Branch 1 should be deleted"
        );
        assert!(
            !branches_list.contains("test-delete-2"),
            "Branch 2 should be deleted"
        );
        assert!(
            branches_list.contains("test-delete-3"),
            "Branch 3 should still exist"
        );

        // Test deleting non-existent branches
        let result = delete_branches(
            path_str.clone(),
            vec!["non-existent-1".to_string(), "non-existent-2".to_string()],
        )
        .await;

        assert!(
            result.is_err(),
            "delete_branches should fail for non-existent branches"
        );
        if let Err(e) = result {
            assert_eq!(e.kind, "branches_not_found", "Wrong error kind");
        }
    }
}

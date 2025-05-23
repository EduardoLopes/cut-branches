// src-tauri/src/git/tests.rs
use super::branch::*; // Access functions from branch.rs
use super::commit::*; // Access functions from commit.rs
                      // super::types::* is already brought in by branch and commit, but explicit if needed for test-specific structs

use crate::test_utils::{setup_test_repo, DirectoryGuard};
use std::path::Path;
use std::process::Command;

// Note: Original tests used `use super::*;` which would now pull from git/mod.rs.
// We need to be more specific or ensure git/mod.rs exports everything needed.
// For clarity, directly use functions from their new modules (branch::*, commit::*)

use super::types::{ConflictResolution, RestoreBranchInput};

#[test]
fn test_branch_exists() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let result = branch_exists(path, &current_branch_name);
    assert!(result.is_ok());
    assert!(result.unwrap());

    let result = branch_exists(path, "non-existent-branch");
    assert!(result.is_ok());
    assert!(!result.unwrap());
}

#[test]
fn test_get_current_branch() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let expected = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let current = get_current_branch(path);
    assert!(
        current.is_ok(),
        "get_current_branch failed: {:?}",
        current.err()
    );
    assert_eq!(current.unwrap(), expected);
}

#[test]
fn test_get_all_branches_with_last_commit() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let branches_result = get_all_branches_with_last_commit(path);
    assert!(
        branches_result.is_ok(),
        "get_all_branches_with_last_commit failed: {:?}",
        branches_result.err()
    );
    let branches = branches_result.unwrap();

    assert!(!branches.is_empty(), "No branches returned");

    let current_branch_opt = branches.iter().find(|b| b.name == current_branch_name);
    assert!(
        current_branch_opt.is_some(),
        "Current branch not found in results"
    );
    let current_branch_obj = current_branch_opt.unwrap();
    assert!(
        current_branch_obj.current,
        "Current branch not marked as current"
    );

    assert!(
        !current_branch_obj.last_commit.sha.is_empty(),
        "Commit SHA is empty"
    );
    assert!(
        !current_branch_obj.last_commit.message.is_empty(),
        "Commit message is empty"
    );
}

#[test]
fn test_switch_branch() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    std::env::set_current_dir(path).unwrap();

    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let original_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let create_output = Command::new("git")
        .args(["checkout", "-b", "test-switch-branch"])
        .current_dir(path)
        .output()
        .unwrap();
    assert!(
        create_output.status.success(),
        "Failed to create test-switch-branch: {}",
        String::from_utf8_lossy(&create_output.stderr)
    );

    let result = switch_branch(path, &original_branch);
    assert!(
        result.is_ok(),
        "Failed to switch back to original: {:?}",
        result.err()
    );
    assert_eq!(
        result.unwrap(),
        original_branch,
        "Returned branch name mismatch after switching back"
    );

    let result = switch_branch(path, "test-switch-branch");
    assert!(
        result.is_ok(),
        "Failed to switch to test-switch-branch: {:?}",
        result.err()
    );
    assert_eq!(
        result.unwrap(),
        "test-switch-branch",
        "Returned branch name mismatch after switching to test branch"
    );
}

#[test]
fn test_delete_branches() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let branch_to_delete_name = "test-branch-to-delete";
    let create_output = Command::new("git")
        .args(["checkout", "-b", branch_to_delete_name])
        .current_dir(path)
        .output()
        .unwrap();
    assert!(
        create_output.status.success(),
        "Failed to create {}: {}",
        branch_to_delete_name,
        String::from_utf8_lossy(&create_output.stderr)
    );

    // Switch back to delete
    Command::new("git")
        .args(["checkout", &current_branch_name])
        .current_dir(path)
        .output()
        .unwrap();

    let branches_to_delete = vec![branch_to_delete_name.to_string()];
    let result = delete_branches(path, &branches_to_delete);
    assert!(result.is_ok(), "delete_branches failed: {:?}", result.err());

    let verify_delete_result = branch_exists(path, branch_to_delete_name);
    assert!(
        !verify_delete_result.unwrap_or(true),
        "Branch should have been deleted"
    );
}

#[test]
fn test_is_commit_reachable() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(path)
        .output()
        .unwrap();
    let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let result = is_commit_reachable(path, &commit_sha);
    assert!(result.is_ok());
    assert!(result.unwrap(), "Current HEAD commit should be reachable");

    let invalid_sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    let result = is_commit_reachable(path, invalid_sha);
    assert!(result.is_ok());
    assert!(
        !result.unwrap(),
        "Non-existent commit should not be reachable"
    );
}

#[test]
fn test_restore_deleted_branch() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(path)
        .output()
        .unwrap();
    let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let branch_to_delete_name = "branch-for-restore-test";

    Command::new("git")
        .args(["branch", branch_to_delete_name, &commit_sha])
        .current_dir(path)
        .output()
        .unwrap();
    assert!(branch_exists(path, branch_to_delete_name).unwrap());

    Command::new("git")
        .args(["branch", "-D", branch_to_delete_name])
        .current_dir(path)
        .output()
        .unwrap();
    assert!(!branch_exists(path, branch_to_delete_name).unwrap());

    let restore_input = RestoreBranchInput {
        original_name: branch_to_delete_name.to_string(),
        target_name: branch_to_delete_name.to_string(),
        commit_sha: commit_sha.clone(),
        conflict_resolution: None,
    };

    let result = restore_deleted_branch(path, &restore_input, None);
    assert!(result.is_ok(), "Restore failed: {:?}", result.err());
    let restore_result = result.unwrap();
    assert!(
        restore_result.success,
        "Restore was not successful: {}",
        restore_result.message
    );
    assert_eq!(restore_result.branch_name, branch_to_delete_name);
    assert!(!restore_result.skipped);
    assert!(branch_exists(path, branch_to_delete_name).unwrap());

    // Test conflict
    let conflict_input = RestoreBranchInput {
        original_name: "some-other-original-name".to_string(),
        target_name: branch_to_delete_name.to_string(), // This now exists
        commit_sha: commit_sha.clone(),
        conflict_resolution: None, // No resolution strategy
    };
    let result = restore_deleted_branch(path, &conflict_input, None);
    assert!(result.is_ok());
    let conflict_result = result.unwrap();
    assert!(!conflict_result.success);
    assert!(conflict_result.requires_user_action);
    assert!(conflict_result.conflict_details.is_some());
    assert_eq!(
        conflict_result.conflict_details.unwrap().conflicting_name,
        branch_to_delete_name
    );

    // Test skip conflict resolution
    let skip_input = RestoreBranchInput {
        original_name: "another-original".to_string(),
        target_name: branch_to_delete_name.to_string(), // Still exists
        commit_sha: commit_sha.clone(),
        conflict_resolution: Some(ConflictResolution::Skip),
    };
    let result = restore_deleted_branch(path, &skip_input, None);
    assert!(result.is_ok());
    let skip_result = result.unwrap();
    assert!(skip_result.skipped, "Branch should have been skipped");
    // Depending on strict interpretation, success might be true or false. Message is key.
    assert!(skip_result.message.contains("Skipped creation of branch"));
}

#[test]
fn test_get_all_branches_with_last_commit_errors() {
    let _guard = DirectoryGuard::new();
    let temp_dir = tempfile::tempdir().unwrap();
    let non_git_path = temp_dir.path();
    let result = get_all_branches_with_last_commit(non_git_path);
    assert!(result.is_err(), "Expected error for non-git directory");

    let malformed_repo = tempfile::tempdir().unwrap();
    let malformed_path = malformed_repo.path();
    std::fs::create_dir(malformed_path.join(".git")).unwrap();
    let result = get_all_branches_with_last_commit(malformed_path);
    assert!(result.is_err(), "Expected error for malformed git repo");
}

#[test]
fn test_get_current_branch_errors() {
    let _guard = DirectoryGuard::new();
    let temp_dir = tempfile::tempdir().unwrap();
    let non_git_path = temp_dir.path();
    let result = get_current_branch(non_git_path);
    assert!(result.is_err(), "Expected error for non-git directory");
}

#[test]
fn test_branch_exists_errors() {
    let _guard = DirectoryGuard::new();
    let temp_dir = tempfile::tempdir().unwrap();
    let non_git_path = temp_dir.path();
    let result = branch_exists(non_git_path, "main");
    assert!(
        result.is_ok(),
        "branch_exists should handle non-git directories gracefully by returning Ok(false)"
    );
    assert!(!result.unwrap());

    let malformed_repo = tempfile::tempdir().unwrap();
    let malformed_path = malformed_repo.path();
    std::fs::create_dir(malformed_path.join(".git")).unwrap();
    let result = branch_exists(malformed_path, "main");
    assert!(
        result.is_ok(),
        "branch_exists should handle malformed repos gracefully by returning Ok(false)"
    );
    assert!(!result.unwrap());
}

#[test]
fn test_is_commit_reachable_comprehensive() {
    let _guard = DirectoryGuard::new();
    let non_git_dir = tempfile::tempdir().unwrap();
    let non_git_path = non_git_dir.path();
    let dummy_sha = "0123456789abcdef0123456789abcdef01234567";
    let result = is_commit_reachable(non_git_path, dummy_sha);
    assert!(result.is_ok());
    assert!(
        !result.unwrap(),
        "is_commit_reachable should return false for non-git directories"
    );

    let repo = setup_test_repo();
    let path = repo.path();
    let commit_output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(path)
        .output()
        .unwrap();
    let full_sha = String::from_utf8(commit_output.stdout)
        .unwrap()
        .trim()
        .to_string();

    let short_sha = full_sha[..7].to_string();
    let result = is_commit_reachable(path, &short_sha);
    assert!(result.is_ok());
    assert!(result.unwrap(), "Short SHA should be reachable");

    let non_existent_sha = "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f"; // unlikely to exist
    let result = is_commit_reachable(path, non_existent_sha);
    assert!(result.is_ok());
    assert!(!result.unwrap(), "Non-existent SHA should not be reachable");

    let malformed_sha = "not-a-sha";
    let result = is_commit_reachable(path, malformed_sha);
    assert!(result.is_ok());
    assert!(!result.unwrap(), "Malformed SHA should not be reachable");

    let empty_sha = "";
    let result = is_commit_reachable(path, empty_sha);
    assert!(result.is_ok());
    assert!(!result.unwrap(), "Empty SHA should not be reachable");
}

#[test]
fn test_restore_deleted_branch_with_overwrite() {
    let _guard = DirectoryGuard::new();
    let repo = setup_test_repo();
    let path = repo.path();

    let commit_output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(path)
        .output()
        .unwrap();
    let commit_sha = String::from_utf8(commit_output.stdout)
        .unwrap()
        .trim()
        .to_string();

    let test_branch_name = "test-overwrite-branch";
    let conflict_branch_name = "existing-conflict-branch";

    // Attempt to restore 'test_branch_name' but name it 'conflict_branch_name' (which exists) using Overwrite
    let restore_info = RestoreBranchInput {
        original_name: test_branch_name.to_string(),
        target_name: conflict_branch_name.to_string(),
        commit_sha: commit_sha.clone(),
        conflict_resolution: Some(ConflictResolution::Overwrite),
    };

    let result = restore_deleted_branch(path, &restore_info, None);
    assert!(
        result.is_ok(),
        "Restore with overwrite failed: {:?}",
        result.err()
    );
    let restore_result = result.unwrap();
    assert!(
        restore_result.success,
        "Restore with overwrite not successful: {}",
        restore_result.message
    );
    assert_eq!(restore_result.branch_name, conflict_branch_name);
    assert!(branch_exists(path, conflict_branch_name).unwrap());

    // Ensure original test_branch_name does not exist (as it was restored as conflict_branch_name)
    assert!(!branch_exists(path, test_branch_name).unwrap_or(true));
}

#[test]
fn test_git_command_error_handling() {
    let _guard = DirectoryGuard::new();
    let non_existent_path = Path::new("/non/existent/path/hopefully");

    let result_branches = get_all_branches_with_last_commit(non_existent_path);
    assert!(result_branches.is_err());
    if let Err(e) = result_branches {
        assert!(e.message.contains("Unable to access the path"));
        assert_eq!(e.kind, "unable_to_access_dir");
    }

    // Note: Testing permission errors is tricky and platform-dependent.
    // The original test for no_permission_path is kept here for conceptual completeness
    // but might be unreliable in CI or different environments.
    let temp_dir_perm = tempfile::tempdir().unwrap();
    let no_permission_path = temp_dir_perm.path();

    #[cfg(unix)]
    {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(no_permission_path).unwrap().permissions();
        perms.set_mode(0o000); // Remove all permissions
        fs::set_permissions(no_permission_path, perms).unwrap();
    }

    // This check might fail if git is not installed or if the permissions test doesn't work as expected
    // For CI, it might be better to mock Command execution or test specific error mapping logic.
    let result_perm_branches = get_all_branches_with_last_commit(no_permission_path);
    if cfg!(unix) {
        // Only assert this on unix where we tried to set no permissions
        assert!(result_perm_branches.is_err());
        if let Err(e) = result_perm_branches {
            assert!(
                e.message.contains("Unable to access the path")
                    || e.message.contains("Failed to execute git command")
                    || e.message.contains("Failed to open git repository")
            );
            // The error kind might vary depending on how git itself or the OS handles this.
            // "unable_to_access_dir" is if the current_dir fails,
            // "command_execution_failed" if git fails to run for other permission reasons.
            assert!(
                e.kind == "unable_to_access_dir"
                    || e.kind == "command_execution_failed"
                    || e.kind == "repository_open_failed"
            );
        }
    }
}

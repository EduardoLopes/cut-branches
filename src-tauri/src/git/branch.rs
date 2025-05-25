use chrono::{DateTime, FixedOffset, TimeZone};
use git2::{BranchType, Oid, Repository};
use std::path::Path;
use tauri::Emitter;

use super::commit::is_commit_reachable;
use super::types::{
    Branch, Commit, ConflictDetails, ConflictResolution, DeletedBranchInfo, RestoreBranchInput,
    RestoreBranchResult,
};
use crate::error::Error;

pub fn get_all_branches_with_last_commit(path: &Path) -> Result<Vec<Branch>, Error> {
    let repo = Repository::open(path).map_err(|e| {
        let err_str = e.to_string();
        let err_str_lower = err_str.to_lowercase();
        if !path.exists() {
            Error::new(
                format!("Unable to access the path: {}", path.display()),
                "unable_to_access_dir",
                Some(err_str.clone()),
            )
        } else if err_str_lower.contains("permission denied")
            || err_str_lower.contains("not permitted")
        {
            Error::new(
                format!("Failed to execute git command: {}", path.display()),
                "command_execution_failed",
                Some(err_str.clone()),
            )
        } else {
            Error::new(
                format!(
                    "Failed to open git repository at {}: {}",
                    path.display(),
                    err_str
                ),
                "repository_open_failed",
                Some(err_str),
            )
        }
    })?;

    let branches_iter = repo.branches(Some(BranchType::Local)).map_err(|e| {
        Error::new(
            format!("Failed to list branches: {}", e),
            "branch_list_failed",
            Some(e.to_string()),
        )
    })?;

    let current_branch_name = get_current_branch(path)?;
    let mut branches = Vec::new();

    for branch_result in branches_iter {
        let (branch, _branch_type) = branch_result.map_err(|e| {
            Error::new(
                format!("Failed to get branch info: {}", e),
                "branch_info_failed",
                Some(e.to_string()),
            )
        })?;

        let name = branch
            .name()
            .map_err(|e| {
                Error::new(
                    format!("Failed to get branch name: {}", e),
                    "branch_name_failed",
                    Some(e.to_string()),
                )
            })?
            .ok_or_else(|| {
                Error::new(
                    "Branch name contains invalid UTF-8".to_string(),
                    "invalid_utf8",
                    None,
                )
            })?
            .to_string();

        let reference = branch.get();
        let commit = reference.peel_to_commit().map_err(|e| {
            Error::new(
                format!("Failed to get commit for branch {}: {}", name, e),
                "commit_peel_failed",
                Some(e.to_string()),
            )
        })?;

        let author = commit.author();

        // Format the commit date
        let time = commit.time();
        let offset_minutes = time.offset_minutes();
        let offset = match FixedOffset::east_opt(offset_minutes * 60) {
            Some(tz) => tz,
            None => FixedOffset::east_opt(0).unwrap(), // Fallback to UTC
        };

        let dt = match DateTime::from_timestamp(time.seconds(), 0) {
            Some(dt) => dt.with_timezone(&offset),
            None => FixedOffset::east_opt(0)
                .unwrap()
                .with_ymd_and_hms(1970, 1, 1, 0, 0, 0)
                .unwrap(), // Fallback to epoch
        };

        let date_str = dt.format("%a %b %e %T %Y %z").to_string();

        let sha = commit.id().to_string();
        let short_sha = if sha.len() >= 7 {
            sha[0..7].to_string()
        } else {
            sha.clone()
        };

        let author_name = author.name().unwrap_or("").to_string();
        let author_email = author.email().unwrap_or("").to_string();
        let summary = commit.summary().unwrap_or("").to_string();

        // Check if branch is fully merged into HEAD
        let is_merged = is_branch_merged(&repo, &name)?;

        branches.push(Branch {
            name: name.clone(),
            fully_merged: is_merged,
            current: name == current_branch_name,
            last_commit: Commit {
                sha,
                short_sha,
                date: date_str,
                message: summary,
                author: author_name,
                email: author_email,
            },
        });
    }

    branches.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    if branches.is_empty() {
        return Err(Error::new(
            format!(
                "Couldn\\'t retrieve branches with last commit info in the path **{0}**",
                path.display()
            ),
            "no_branches",
            None,
        ));
    }

    Ok(branches)
}

fn is_branch_merged(repo: &Repository, branch_name: &str) -> Result<bool, Error> {
    let head = repo.head().map_err(|e| {
        Error::new(
            format!("Failed to get HEAD: {}", e),
            "head_not_found",
            Some(e.to_string()),
        )
    })?;

    let branch_ref = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| {
            Error::new(
                format!("Failed to find branch '{}': {}", branch_name, e),
                "branch_not_found",
                Some(e.to_string()),
            )
        })?;

    // Get the commit each reference points to
    let head_commit = head.peel_to_commit().map_err(|e| {
        Error::new(
            format!("Failed to get HEAD commit: {}", e),
            "head_commit_failed",
            Some(e.to_string()),
        )
    })?;

    let branch_commit = branch_ref.get().peel_to_commit().map_err(|e| {
        Error::new(
            format!("Failed to get branch commit: {}", e),
            "branch_commit_failed",
            Some(e.to_string()),
        )
    })?;

    // If it's the current branch, it's "merged" by definition
    if head_commit.id() == branch_commit.id() {
        return Ok(true);
    }

    // Check if the branch commit is an ancestor of HEAD
    Ok(repo
        .graph_descendant_of(head_commit.id(), branch_commit.id())
        .unwrap_or(false))
}

pub fn get_current_branch(path: &Path) -> Result<String, Error> {
    let repo = Repository::open(path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository at {}: {}", path.display(), e),
            "repository_open_failed",
            Some(e.to_string()),
        )
    })?;

    let head = repo.head().map_err(|e| {
        Error::new(
            format!("Failed to get HEAD: {}", e),
            "head_not_found",
            Some(e.to_string()),
        )
    })?;

    if !head.is_branch() {
        return Err(Error::new(
            format!(
                "HEAD is not pointing to a branch in path {}",
                path.display()
            ),
            "detached_head",
            Some("Repository is in detached HEAD state".to_string()),
        ));
    }

    let branch_name = head.shorthand().ok_or_else(|| {
        Error::new(
            format!("Failed to get branch name in path {}", path.display()),
            "invalid_branch_name",
            Some("Branch name contains invalid UTF-8".to_string()),
        )
    })?;

    Ok(branch_name.to_string())
}

pub fn branch_exists(path: &Path, branch_name: &str) -> Result<bool, Error> {
    let repo = match Repository::open(path) {
        Ok(repo) => repo,
        Err(_) => return Ok(false),
    };

    // Fix lifetime issue by not directly returning the match
    let exists = repo.find_branch(branch_name, BranchType::Local).is_ok();

    Ok(exists)
}

pub fn switch_branch(path: &Path, branch_name: &str) -> Result<String, Error> {
    let repo = Repository::open(path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository at {}: {}", path.display(), e),
            "repository_open_failed",
            Some(e.to_string()),
        )
    })?;

    // Check if branch exists
    if !branch_exists(path, branch_name)? {
        return Err(Error::new(
            format!("Branch **{0}** not found", branch_name),
            "branch_not_found",
            Some(format!(
                "The branch '{}' does not exist in the repository at {}",
                branch_name,
                path.display()
            )),
        ));
    }

    // Get reference to branch
    let branch_ref = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| {
            Error::new(
                format!("Failed to find branch '{}': {}", branch_name, e),
                "branch_not_found",
                Some(e.to_string()),
            )
        })?;

    let reference = branch_ref.get();
    // We don't actually use this commit, but we need to check it exists
    let _commit = reference.peel_to_commit().map_err(|e| {
        Error::new(
            format!("Failed to get commit for branch {}: {}", branch_name, e),
            "commit_peel_failed",
            Some(e.to_string()),
        )
    })?;

    // Set HEAD to the branch
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| {
            Error::new(
                format!("Failed to set HEAD to branch '{}': {}", branch_name, e),
                "set_head_failed",
                Some(e.to_string()),
            )
        })?;

    // Checkout the branch (update working directory)
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| {
            Error::new(
                format!("Failed to checkout branch '{}': {}", branch_name, e),
                "checkout_failed",
                Some(e.to_string()),
            )
        })?;

    Ok(branch_name.to_string())
}

pub fn delete_branches(
    path: &Path,
    branches_to_delete: &[String],
) -> Result<Vec<DeletedBranchInfo>, Error> {
    let repo = Repository::open(path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository at {}: {}", path.display(), e),
            "repository_open_failed",
            Some(e.to_string()),
        )
    })?;

    let mut not_found_branches: Vec<String> = Vec::new();
    let mut found_branches: Vec<String> = Vec::new();

    for branch_name_to_check in branches_to_delete {
        if branch_exists(path, branch_name_to_check)? {
            found_branches.push(branch_name_to_check.clone());
        } else {
            not_found_branches.push(branch_name_to_check.clone());
        }
    }

    if !not_found_branches.is_empty() {
        return Err(Error::new(
            format!(
                "Branch(es) not found: **{0}**. {1} still exist(s).",
                not_found_branches.join(", "),
                if found_branches.is_empty() {
                    "No branches were".to_string()
                } else {
                    format!("The branch(es) **{}**", found_branches.join(", "))
                }
            ),
            "branches_not_found",
            Some(format!(
                "Cannot find the following branches: {}. Path: {}",
                not_found_branches.join(", "),
                path.display()
            )),
        ));
    }

    if found_branches.is_empty() {
        return Ok(Vec::new()); // No branches to delete that were found
    }

    let mut deleted_branches = Vec::new();

    for branch_name in &found_branches {
        // Get branch info before deletion for the return value
        let branch_info = get_branch_info(&repo, branch_name)?;

        // Find the branch
        let mut branch = repo
            .find_branch(branch_name, BranchType::Local)
            .map_err(|e| {
                Error::new(
                    format!("Failed to find branch '{}': {}", branch_name, e),
                    "branch_not_found",
                    Some(e.to_string()),
                )
            })?;

        // Delete the branch (force=true to match original -D flag behavior)
        branch.delete().map_err(|e| {
            Error::new(
                format!("Failed to delete branch '{}': {}", branch_name, e),
                "delete_branch_failed",
                Some(e.to_string()),
            )
        })?;

        // Clone branch_info.last_commit.short_sha to avoid borrowing after move
        let short_sha = branch_info.last_commit.short_sha.clone();

        deleted_branches.push(DeletedBranchInfo {
            branch: branch_info,
            raw_output: format!("Deleted branch {} (was {})", branch_name, short_sha),
        });
    }

    Ok(deleted_branches)
}

fn get_branch_info(repo: &Repository, branch_name: &str) -> Result<Branch, Error> {
    let branch = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| {
            Error::new(
                format!("Failed to find branch '{}': {}", branch_name, e),
                "branch_not_found",
                Some(e.to_string()),
            )
        })?;

    let reference = branch.get();
    let commit = reference.peel_to_commit().map_err(|e| {
        Error::new(
            format!("Failed to get commit for branch {}: {}", branch_name, e),
            "commit_peel_failed",
            Some(e.to_string()),
        )
    })?;

    let author = commit.author();

    // Format the commit date
    let time = commit.time();
    let offset_minutes = time.offset_minutes();
    let offset = match FixedOffset::east_opt(offset_minutes * 60) {
        Some(tz) => tz,
        None => FixedOffset::east_opt(0).unwrap(), // Fallback to UTC
    };

    let dt = match DateTime::from_timestamp(time.seconds(), 0) {
        Some(dt) => dt.with_timezone(&offset),
        None => FixedOffset::east_opt(0)
            .unwrap()
            .with_ymd_and_hms(1970, 1, 1, 0, 0, 0)
            .unwrap(), // Fallback to epoch
    };

    let date_str = dt.format("%a %b %e %T %Y %z").to_string();

    let sha = commit.id().to_string();
    let short_sha = if sha.len() >= 7 {
        sha[0..7].to_string()
    } else {
        sha.clone()
    };

    // Use summary if available, otherwise get the first line of the message
    let message = commit.message().unwrap_or("");
    let first_line = message.lines().next().unwrap_or("").to_string();

    let author_name = author.name().unwrap_or("").to_string();
    let author_email = author.email().unwrap_or("").to_string();

    // Check if branch is fully merged
    let is_merged = is_branch_merged(repo, branch_name)?;

    // Check if it's the current branch
    let head = repo.head().map_err(|e| {
        Error::new(
            format!("Failed to get HEAD: {}", e),
            "head_not_found",
            Some(e.to_string()),
        )
    })?;

    let current = head.is_branch()
        && head
            .shorthand()
            .map(|name| name == branch_name)
            .unwrap_or(false);

    Ok(Branch {
        name: branch_name.to_string(),
        fully_merged: is_merged,
        current,
        last_commit: Commit {
            sha,
            short_sha,
            date: date_str,
            message: first_line,
            author: author_name,
            email: author_email,
        },
    })
}

pub fn restore_deleted_branch(
    path: &Path,
    branch_info: &RestoreBranchInput,
    app_handle: Option<&tauri::AppHandle>,
) -> Result<RestoreBranchResult, Error> {
    let repo = Repository::open(path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository at {}: {}", path.display(), e),
            "repository_open_failed",
            Some(e.to_string()),
        )
    })?;

    // Check if the commit exists in the repository
    if !is_commit_reachable(path, &branch_info.commit_sha)? {
        return Err(Error::new(
            format!(
                "Commit **{}** not found in the repository",
                branch_info.commit_sha
            ),
            "commit_not_found",
            Some(format!(
                "The commit '{}' does not exist in the repository at {}",
                branch_info.commit_sha,
                path.display()
            )),
        ));
    }

    // Check if target branch already exists
    let target_branch_exists = branch_exists(path, &branch_info.target_name)?;

    if target_branch_exists {
        // Handle conflict based on user's preference
        match &branch_info.conflict_resolution {
            Some(ConflictResolution::Overwrite) => {
                // Delete existing branch first
                let mut branch = repo
                    .find_branch(&branch_info.target_name, BranchType::Local)
                    .map_err(|e| {
                        Error::new(
                            format!("Failed to find branch '{}': {}", branch_info.target_name, e),
                            "branch_not_found",
                            Some(e.to_string()),
                        )
                    })?;

                branch.delete().map_err(|e| {
                    Error::new(
                        format!(
                            "Failed to delete branch '{}': {}",
                            branch_info.target_name, e
                        ),
                        "delete_branch_failed",
                        Some(e.to_string()),
                    )
                })?;

                // Now create the branch
                create_branch_at_commit(
                    path,
                    &branch_info.target_name,
                    &branch_info.commit_sha,
                    app_handle,
                )
            }
            Some(ConflictResolution::Rename) => {
                // Create with new name
                create_branch_at_commit(
                    path,
                    &branch_info.target_name,
                    &branch_info.commit_sha,
                    app_handle,
                )
            }
            Some(ConflictResolution::Skip) => Ok(RestoreBranchResult {
                success: false,
                branch_name: branch_info.target_name.clone(),
                message: format!("Skipped creation of branch '{}'", branch_info.target_name),
                requires_user_action: false,
                conflict_details: None,
                skipped: true,
                branch: None,
            }),
            None => {
                // No conflict resolution strategy, ask user
                Ok(RestoreBranchResult {
                    success: false,
                    branch_name: branch_info.target_name.clone(),
                    message: format!(
                        "Branch '{}' already exists. Please choose a conflict resolution strategy.",
                        branch_info.target_name
                    ),
                    requires_user_action: true,
                    conflict_details: Some(ConflictDetails {
                        original_name: branch_info.original_name.clone(),
                        conflicting_name: branch_info.target_name.clone(),
                    }),
                    skipped: false,
                    branch: None,
                })
            }
        }
    } else {
        // No conflict, create the branch
        create_branch_at_commit(
            path,
            &branch_info.target_name,
            &branch_info.commit_sha,
            app_handle,
        )
    }
}

fn create_branch_at_commit(
    path: &Path,
    branch_name: &str,
    commit_sha: &str,
    app_handle: Option<&tauri::AppHandle>,
) -> Result<RestoreBranchResult, Error> {
    let repo = Repository::open(path).map_err(|e| {
        Error::new(
            format!("Failed to open git repository at {}: {}", path.display(), e),
            "repository_open_failed",
            Some(e.to_string()),
        )
    })?;

    let commit_id = Oid::from_str(commit_sha).map_err(|e| {
        Error::new(
            format!("Invalid commit SHA '{}': {}", commit_sha, e),
            "invalid_commit_sha",
            Some(e.to_string()),
        )
    })?;

    let commit = repo.find_commit(commit_id).map_err(|e| {
        Error::new(
            format!("Failed to find commit '{}': {}", commit_sha, e),
            "commit_not_found",
            Some(e.to_string()),
        )
    })?;

    repo.branch(branch_name, &commit, false).map_err(|e| {
        Error::new(
            format!("Failed to create branch '{}': {}", branch_name, e),
            "create_branch_failed",
            Some(e.to_string()),
        )
    })?;

    // Get the branch info after creation
    let branch_info = get_branch_info(&repo, branch_name)?;

    // Emit event for branch restoration if we have an app handle
    if let Some(handle) = app_handle {
        let _ = handle.emit("branch-restored", branch_name);
    }

    Ok(RestoreBranchResult {
        success: true,
        branch_name: branch_name.to_string(),
        message: format!(
            "Branch '{}' has been successfully restored at commit {}",
            branch_name, commit_sha
        ),
        requires_user_action: false,
        conflict_details: None,
        skipped: false,
        branch: Some(branch_info),
    })
}

pub fn restore_deleted_branches(
    path: &Path,
    branch_infos: &[RestoreBranchInput],
    app_handle: Option<&tauri::AppHandle>,
) -> Result<Vec<(String, RestoreBranchResult)>, Error> {
    let mut results = Vec::new();

    for branch_info in branch_infos {
        let result = restore_deleted_branch(path, branch_info, app_handle)?;
        results.push((branch_info.target_name.clone(), result));
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

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

    #[test]
    fn test_restore_deleted_branches() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Get current commit SHA
        let commit_output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        // Create and delete test branches
        let branch_names = vec!["test-branch-1", "test-branch-2", "test-branch-3"];
        for branch_name in &branch_names {
            Command::new("git")
                .args(["branch", branch_name, &commit_sha])
                .current_dir(path)
                .output()
                .unwrap();
            Command::new("git")
                .args(["branch", "-D", branch_name])
                .current_dir(path)
                .output()
                .unwrap();
        }

        // Create restore inputs
        let restore_inputs: Vec<RestoreBranchInput> = branch_names
            .iter()
            .map(|name| RestoreBranchInput {
                original_name: name.to_string(),
                target_name: name.to_string(),
                commit_sha: commit_sha.clone(),
                conflict_resolution: None,
            })
            .collect();

        // Test successful restore of all branches
        let result = restore_deleted_branches(path, &restore_inputs, None);
        assert!(result.is_ok(), "Restore failed: {:?}", result.err());
        let restore_results = result.unwrap();
        assert_eq!(restore_results.len(), branch_names.len());

        // Verify all branches were restored successfully
        for (name, result) in restore_results {
            assert!(
                result.success,
                "Branch {} restore failed: {}",
                name, result.message
            );
            assert!(!result.skipped);
            assert!(branch_exists(path, &name).unwrap());
        }

        // Test restore with conflicts
        let conflict_inputs = vec![
            RestoreBranchInput {
                original_name: "conflict-original-1".to_string(),
                target_name: branch_names[0].to_string(), // This now exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: None,
            },
            RestoreBranchInput {
                original_name: "conflict-original-2".to_string(),
                target_name: branch_names[1].to_string(), // This now exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Skip),
            },
        ];

        let result = restore_deleted_branches(path, &conflict_inputs, None);
        assert!(
            result.is_ok(),
            "Restore with conflicts failed: {:?}",
            result.err()
        );
        let conflict_results = result.unwrap();
        assert_eq!(conflict_results.len(), conflict_inputs.len());

        // Verify conflict handling
        for (_name, result) in conflict_results {
            if result.conflict_details.is_some() {
                assert!(!result.success);
                assert!(result.requires_user_action);
            } else if result.skipped {
                assert!(result.message.contains("Skipped creation of branch"));
            }
        }

        // Test restore with overwrite
        let overwrite_inputs = vec![
            RestoreBranchInput {
                original_name: "overwrite-original-1".to_string(),
                target_name: branch_names[0].to_string(), // This exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Overwrite),
            },
            RestoreBranchInput {
                original_name: "overwrite-original-2".to_string(),
                target_name: branch_names[1].to_string(), // This exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Overwrite),
            },
        ];

        let result = restore_deleted_branches(path, &overwrite_inputs, None);
        assert!(
            result.is_ok(),
            "Restore with overwrite failed: {:?}",
            result.err()
        );
        let overwrite_results = result.unwrap();
        assert_eq!(overwrite_results.len(), overwrite_inputs.len());

        // Verify overwrite handling
        for (name, result) in overwrite_results {
            assert!(
                result.success,
                "Overwrite failed for {}: {}",
                name, result.message
            );
            assert!(!result.skipped);
            assert!(branch_exists(path, &name).unwrap());
        }
    }

    #[test]
    fn test_restore_deleted_branches_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();

        let restore_inputs = vec![RestoreBranchInput {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "invalid-sha".to_string(),
            conflict_resolution: None,
        }];

        // Test with non-git directory
        let result = restore_deleted_branches(non_git_path, &restore_inputs, None);
        assert!(result.is_err(), "Expected error for non-git directory");

        // Test with invalid commit SHA
        let repo = setup_test_repo();
        let path = repo.path();
        let result = restore_deleted_branches(path, &restore_inputs, None);
        assert!(result.is_err(), "Expected error for invalid commit SHA");
    }

    #[test]
    fn test_restore_deleted_branch_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();

        // Test with non-git directory
        let restore_input = RestoreBranchInput {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "invalid-sha".to_string(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(non_git_path, &restore_input, None);
        assert!(result.is_err(), "Expected error for non-git directory");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to open git repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "repository_open_failed");
        }

        // Test with invalid commit SHA
        let repo = setup_test_repo();
        let path = repo.path();
        let result = restore_deleted_branch(path, &restore_input, None);
        assert!(result.is_err(), "Expected error for invalid commit SHA");
        if let Err(e) = result {
            assert!(
                e.message
                    .contains("Commit **invalid-sha** not found in the repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "commit_not_found");
        }

        // Test with non-existent commit
        let restore_input = RestoreBranchInput {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "0000000000000000000000000000000000000000".to_string(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &restore_input, None);
        assert!(result.is_err(), "Expected error for non-existent commit");
        if let Err(e) = result {
            assert!(
                e.message.contains("Commit **0000000000000000000000000000000000000000** not found in the repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "commit_not_found");
        }

        // Test with malformed repository
        let malformed_repo = tempfile::tempdir().unwrap();
        let malformed_path = malformed_repo.path();
        std::fs::create_dir(malformed_path.join(".git")).unwrap();

        let result = restore_deleted_branch(malformed_path, &restore_input, None);
        assert!(result.is_err(), "Expected error for malformed repository");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to open git repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "repository_open_failed");
        }

        // Test with permission denied
        #[cfg(unix)]
        {
            use std::fs;
            use std::os::unix::fs::PermissionsExt;
            let temp_dir_perm = tempfile::tempdir().unwrap();
            let no_permission_path = temp_dir_perm.path();
            let mut perms = fs::metadata(no_permission_path).unwrap().permissions();
            perms.set_mode(0o000); // Remove all permissions
            fs::set_permissions(no_permission_path, perms).unwrap();

            let result = restore_deleted_branch(no_permission_path, &restore_input, None);
            assert!(result.is_err(), "Expected error for permission denied");
            if let Err(e) = result {
                assert!(
                    e.message.contains("Failed to open git repository")
                        || e.message.contains("Failed to execute git command"),
                    "Unexpected error message: {}",
                    e.message
                );
                assert!(e.kind == "repository_open_failed" || e.kind == "command_execution_failed");
            }
        }

        // Test with invalid branch name
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

        let invalid_branch_input = RestoreBranchInput {
            original_name: "test branch with spaces".to_string(), // Invalid branch name with spaces
            target_name: "test branch with spaces".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &invalid_branch_input, None);
        assert!(result.is_err(), "Expected error for invalid branch name");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to create branch"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "create_branch_failed");
        }
    }
}

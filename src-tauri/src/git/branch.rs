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

use std::io::ErrorKind;
use std::path::Path;
use std::process::Command;

use super::commit::{get_last_commit_info, is_commit_reachable};
use super::types::{
    Branch, Commit, ConflictDetails, ConflictResolution, DeletedBranchInfo, RestoreBranchInput,
    RestoreBranchResult,
};
use crate::error::Error; // For use in delete_branches

pub fn get_all_branches_with_last_commit(path: &Path) -> Result<Vec<Branch>, Error> {
    let result = Command::new("git")
        .arg("for-each-ref")
        .arg("--format=%(refname:short)|%(objectname)|%(committerdate)|%(contents:subject)|%(authorname)|%(authoremail)")
        .arg("refs/heads/")
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| {
            match e.kind() {
                ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                    format!("Unable to access the path **{}**: {}", path.display(), e),
                    "unable_to_access_dir",
                    Some(e.to_string()),
                ),
                _ => Error::new(
                    format!(
                        "Failed to execute git command for path {}: {}",
                        path.display(),
                        e
                    ),
                    "command_execution_failed",
                    Some(e.to_string()),
                ),
            }
        })?;

    let merged_result = Command::new("git")
        .arg("branch")
        .arg("--merged")
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let merged_branches_str = String::from_utf8(merged_result.stdout).map_err(|e| {
        Error::new(
            format!("Failed to parse stdout for merged branches: {}", e),
            "stdout_parse_failed",
            Some(format!(
                "Error parsing git merged branches output to UTF-8: {}",
                e
            )),
        )
    })?;

    let merged_branches: Vec<String> = merged_branches_str
        .split('\n')
        .map(|s| s.trim().replace("* ", ""))
        .filter(|s| !s.is_empty())
        .collect();

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if result.status.success() {
        let output = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout for all branches: {}", e),
                "stdout_parse_failed",
                Some(format!("Error parsing git command output to UTF-8: {}", e)),
            )
        })?;

        let current_branch_name = get_current_branch(path)?;

        let mut branches: Vec<Branch> = output
            .trim()
            .split('\n')
            .filter(|line| !line.is_empty())
            .map(|line| {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() < 6 {
                    return Err(Error::new(
                        "Invalid branch format in git output".to_string(),
                        "invalid_format",
                        Some(line.to_string()),
                    ));
                }

                let branch_name = parts[0].to_string();

                Ok(Branch {
                    name: branch_name.clone(),
                    fully_merged: merged_branches.contains(&branch_name),
                    current: branch_name == current_branch_name,
                    last_commit: Commit {
                        sha: parts[1].to_string(),
                        short_sha: if parts[1].len() >= 7 {
                            parts[1][0..7].to_string()
                        } else {
                            parts[1].to_string()
                        },
                        date: parts[2].to_string(),
                        message: parts[3].to_string(),
                        author: parts[4].to_string(),
                        email: parts[5].to_string(),
                    },
                })
            })
            .collect::<Result<Vec<_>, _>>()?;

        branches.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        return Ok(branches);
    }

    Err(Error::new(
        format!(
            "Couldn\\'t retrieve branches with last commit info in the path **{0}**",
            path.display()
        ),
        "no_branches",
        Some(stderr),
    ))
}

pub fn get_current_branch(path: &Path) -> Result<String, Error> {
    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if result.status.success() {
        let current_branch_name = String::from_utf8(result.stdout)
            .map_err(|e| {
                Error::new(
                    format!("Failed to parse stdout for current branch: {}", e),
                    "stdout_parse_failed",
                    Some(format!("Error parsing current branch name to UTF-8: {}", e)),
                )
            })?
            .trim()
            .to_string();

        return Ok(current_branch_name);
    }

    Err(Error::new(
        format!(
            "Couldn\\'t find the current branch in the path **{0}**",
            path.display()
        ),
        "no_current_branch", // Changed error code for clarity
        Some(stderr),
    ))
}

pub fn branch_exists(path: &Path, branch_name: &str) -> Result<bool, Error> {
    let result = Command::new("git")
        .arg("show-ref")
        .arg("--verify")
        .arg(format!("refs/heads/{}", branch_name))
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;
    Ok(result.status.success())
}

pub fn switch_branch(path: &Path, branch_name: &str) -> Result<String, Error> {
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

    let result = Command::new("git")
        .arg("switch")
        .arg(branch_name)
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr from switch branch: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if result.status.success() {
        // Successfully switched, return the name of the branch we switched to
        return Ok(branch_name.to_string());
    }

    Err(Error::new(
        format!(
            "Couldn\\'t switch to branch **{0}** in the path **{1}**: {2}",
            branch_name,
            path.display(),
            stderr
        ),
        "switch_branch_failed",
        Some(stderr),
    ))
}

pub fn delete_branches(
    path: &Path,
    branches_to_delete: &[String],
) -> Result<Vec<DeletedBranchInfo>, Error> {
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

    let result = Command::new("git")
        .arg("branch")
        .arg("-D") // Use -D for force delete, as per original code
        .args(&found_branches) // Delete only the found branches
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let stdout = String::from_utf8(result.stdout).map_err(|e| {
        Error::new(
            format!("Failed to parse stdout from delete branches: {}", e),
            "stdout_parse_failed",
            Some(format!("Error parsing git command output to UTF-8: {}", e)),
        )
    })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr from delete branches: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if !result.status.success() {
        return Err(Error::new(
            format!(
                "Unable to delete branches in {}: {}",
                path.display(),
                stderr
            ),
            "unable_to_delete_branches",
            Some(stderr),
        ));
    }

    let deleted_branch_infos: Vec<DeletedBranchInfo> = stdout
        .trim()
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|output_line| {
            let raw_output = output_line.to_string();
            let branch_name = if let Some(name_part) = output_line.strip_prefix("Deleted branch ") {
                if let Some(end_idx) = name_part.find(" (was ") {
                    name_part[..end_idx].to_string()
                } else {
                    name_part.to_string() // Should not happen with git branch -D output
                }
            } else {
                "unknown_branch_name".to_string() // Should not happen
            };

            let commit_hash = if let Some(idx) = output_line.find(" (was ") {
                let hash_part = &output_line[idx + 6..]; // Skip " (was "
                if let Some(end_idx) = hash_part.find(")") {
                    hash_part[..end_idx].to_string()
                } else {
                    "unknown_commit_hash".to_string() // Should not happen
                }
            } else {
                "unknown_commit_hash".to_string() // Should not happen
            };

            let commit_info = match get_last_commit_info(path, &commit_hash) {
                Ok(ci) => ci,
                Err(_) => Commit {
                    // Fallback if commit info isn't retrievable (e.g., commit became unreachable)
                    sha: commit_hash.clone(),
                    short_sha: if commit_hash.len() >= 7 {
                        commit_hash[0..7].to_string()
                    } else {
                        commit_hash.to_string()
                    },
                    date: "unknown".to_string(),
                    message: "Commit information not available after deletion".to_string(),
                    author: "unknown".to_string(),
                    email: "unknown".to_string(),
                },
            };

            DeletedBranchInfo {
                branch: Branch {
                    name: branch_name,
                    fully_merged: false, // Assume not merged, or this info is lost post-deletion
                    last_commit: commit_info,
                    current: false, // Cannot be current if deleted
                },
                raw_output,
            }
        })
        .collect();

    Ok(deleted_branch_infos)
}

pub fn restore_deleted_branch(
    path: &Path,
    branch_info: &RestoreBranchInput,
) -> Result<RestoreBranchResult, Error> {
    if !is_commit_reachable(path, &branch_info.commit_sha)? {
        return Ok(RestoreBranchResult {
            success: false,
            branch_name: branch_info.original_name.clone(),
            message: format!(
                "Commit SHA **'{}'** is not reachable or does not exist in the repository at {}.",
                branch_info.commit_sha,
                path.display()
            ),
            requires_user_action: false,
            conflict_details: None,
            skipped: false,
        });
    }

    let target_branch_exists = branch_exists(path, &branch_info.target_name)?;

    if !target_branch_exists {
        return create_branch_at_commit(path, &branch_info.target_name, &branch_info.commit_sha);
    }

    // Handle conflict based on resolution strategy
    match &branch_info.conflict_resolution {
        Some(ConflictResolution::Overwrite) => {
            // First, delete the existing branch forcefully
            let delete_result = Command::new("git")
                .arg("branch")
                .arg("-D")
                .arg(&branch_info.target_name)
                .current_dir(path)
                .output()
                .map_err(|e| {
                    Error::new(
                        format!("Failed to execute git delete for overwrite: {}", e),
                        "command_execution_failed",
                        Some(e.to_string()),
                    )
                })?;

            if !delete_result.status.success() {
                let stderr = String::from_utf8_lossy(&delete_result.stderr).to_string();
                return Ok(RestoreBranchResult {
                    success: false,
                    branch_name: branch_info.target_name.clone(),
                    message: format!(
                        "Failed to delete existing branch '{}' for overwrite: {}",
                        branch_info.target_name, stderr
                    ),
                    requires_user_action: false,
                    conflict_details: None,
                    skipped: false,
                });
            }
            // Then, create the new branch
            create_branch_at_commit(path, &branch_info.target_name, &branch_info.commit_sha)
        }
        Some(ConflictResolution::Rename) => {
            // The target_name in RestoreBranchInput is already the new name for rename scenario
            create_branch_at_commit(path, &branch_info.target_name, &branch_info.commit_sha)
        }
        Some(ConflictResolution::Skip) => Ok(RestoreBranchResult {
            success: true, // Or false, depending on desired semantics for skipped operations
            branch_name: branch_info.original_name.clone(), // Report original name if skipped
            message: format!(
                "Skipped restoration of branch '{}' as target '{}' due to conflict.",
                branch_info.original_name, branch_info.target_name
            ),
            requires_user_action: false,
            conflict_details: None,
            skipped: true,
        }),
        None => {
            // No resolution strategy provided, conflict exists
            Ok(RestoreBranchResult {
                success: false,
                branch_name: branch_info.original_name.clone(),
                message: format!(
                    "Branch name '{}' already exists. No conflict resolution strategy provided for original branch '{}'.",
                    branch_info.target_name, branch_info.original_name
                ),
                requires_user_action: true,
                conflict_details: Some(ConflictDetails {
                    original_name: branch_info.original_name.clone(),
                    conflicting_name: branch_info.target_name.clone(),
                }),
                skipped: false,
            })
        }
    }
}

// Helper function to create a branch at a specific commit
fn create_branch_at_commit(
    path: &Path,
    branch_name: &str,
    commit_sha: &str,
) -> Result<RestoreBranchResult, Error> {
    let result = Command::new("git")
        .arg("branch")
        .arg(branch_name)
        .arg(commit_sha)
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path **'{}'**: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let short_commit_sha = Command::new("git")
        .arg("rev-parse")
        .arg("--short")
        .arg(commit_sha)
        .current_dir(path)
        .output()
        .map_err(|e| {
            Error::new(
                format!("Failed to get short commit SHA: {}", e),
                "command_execution_failed",
                Some(e.to_string()),
            )
        })?;

    let short_commit_sha = String::from_utf8(short_commit_sha.stdout)
        .map_err(|e| {
            Error::new(
                format!("Failed to parse short commit SHA: {}", e),
                "stdout_parse_failed",
                Some(e.to_string()),
            )
        })?
        .trim()
        .to_string();

    if result.status.success() {
        Ok(RestoreBranchResult {
            success: true,
            branch_name: branch_name.to_string(),
            message: format!(
                "Branch **'{}'** restored successfully from commit **'{}'**.",
                branch_name, short_commit_sha
            ),
            requires_user_action: false,
            conflict_details: None,
            skipped: false,
        })
    } else {
        let stderr = String::from_utf8(result.stderr).map_err(|e| {
            Error::new(
                format!("Failed to parse stderr from create branch: {}", e),
                "stderr_parse_failed",
                Some(format!("Error parsing git error output to UTF-8: {}", e)),
            )
        })?;
        Ok(RestoreBranchResult {
            success: false,
            branch_name: branch_name.to_string(),
            message: format!("Failed to restore branch '{}': {}", branch_name, stderr),
            requires_user_action: false,
            conflict_details: None,
            skipped: false,
        })
    }
}

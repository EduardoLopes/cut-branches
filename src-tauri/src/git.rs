use std::io::ErrorKind;
use std::path::Path;
use std::process::Command;

use crate::error::Error;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub short_sha: String,
    pub date: String,
    pub message: String,
    pub author: String,
    pub email: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Branch {
    pub name: String,
    #[serde(rename = "fullyMerged")]
    pub fully_merged: bool,
    #[serde(rename = "lastCommit")]
    pub last_commit: Commit,
    pub current: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    #[serde(rename = "currentBranch")]
    pub current_branch: String,
    #[serde(rename = "branchesCount")]
    pub branches_count: usize,
    pub name: String,
    pub id: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct DeletedBranchInfo {
    pub branch: Branch,
    pub raw_output: String,
}

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

    let merged_branches = String::from_utf8(merged_result.stdout).map_err(|e| {
        Error::new(
            format!("Failed to parse stdout: {}", e),
            "stdout_parse_failed",
            Some(format!("Error parsing git branches output to UTF-8: {}", e)),
        )
    })?;

    let merged_branches: Vec<String> = merged_branches
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
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                Some(format!("Error parsing git command output to UTF-8: {}", e)),
            )
        })?;

        let current_branch = get_current_branch(path)?;

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
                    current: branch_name == current_branch,
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
        let current_branch = String::from_utf8(result.stdout)
            .map_err(|e| {
                Error::new(
                    format!("Failed to parse stdout: {}", e),
                    "stdout_parse_failed",
                    Some(format!("Error parsing current branch name to UTF-8: {}", e)),
                )
            })?
            .trim()
            .to_string();

        return Ok(current_branch);
    }

    Err(Error::new(
        format!(
            "Couldn\\'t find the current branch in the path **{0}**",
            path.display()
        ),
        "no_branches",
        Some(stderr),
    ))
}

#[allow(dead_code)]
pub fn get_last_commit_info(path: &Path, branch: &str) -> Result<Commit, Error> {
    let result = Command::new("git")
        .arg("log")
        .arg("-1")
        .arg("--pretty=format:%H|%ad|%s|%an|%ae")
        .arg(branch)
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
        let commit_info = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                Some(format!("Error parsing commit info to UTF-8: {}", e)),
            )
        })?;
        let commit_info = commit_info.trim().split('|').collect::<Vec<_>>();

        if commit_info.len() == 5 {
            return Ok(Commit {
                sha: commit_info[0].to_string(),
                short_sha: if commit_info[0].len() >= 7 {
                    commit_info[0][0..7].to_string()
                } else {
                    commit_info[0].to_string()
                },
                date: commit_info[1].to_string(),
                message: commit_info[2].to_string(),
                author: commit_info[3].to_string(),
                email: commit_info[4].to_string(),
            });
        } else {
            return Err(Error::new(
                "Unexpected commit info format".to_string(),
                "unexpected_format",
                Some(commit_info.join("|")),
            ));
        }
    }

    Err(Error::new(
        format!(
            "Couldn\\'t find the last commit in the path **{0}**",
            path.display()
        ),
        "no_commit",
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

pub fn switch_branch(path: &Path, branch: &str) -> Result<String, Error> {
    if !branch_exists(path, branch)? {
        return Err(Error::new(
            format!("Branch **{0}** not found", branch),
            "branch_not_found",
            Some(format!(
                "The branch '{}' does not exist in the repository",
                branch
            )),
        ));
    }

    let result = Command::new("git")
        .arg("switch")
        .arg(branch)
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
        let current_branch = get_current_branch(path)?;
        return Ok(current_branch);
    }

    Err(Error::new(
        format!(
            "Couldn\\'t switch to branch **{0}** in the path **{1}**",
            branch,
            path.display()
        ),
        "switch_branch_failed",
        Some(stderr),
    ))
}

pub fn delete_branches(path: &Path, branches: &[String]) -> Result<Vec<DeletedBranchInfo>, Error> {
    let mut not_found_branches: Vec<String> = Vec::new();
    let mut found_branches: Vec<String> = Vec::new();

    for branch in branches {
        if branch_exists(path, branch)? {
            found_branches.push(branch.clone());
        } else {
            not_found_branches.push(branch.clone());
        }
    }

    if !not_found_branches.is_empty() {
        return Err(Error::new(
            format!(
                "Branch{2} not found: **{0}**. The branch{3} **{1}** still exists",
                not_found_branches.join(", "),
                found_branches.join(", "),
                if not_found_branches.len() == 1 {
                    ""
                } else {
                    "es"
                },
                if found_branches.len() == 1 { "" } else { "es" },
            ),
            "branches_not_found",
            Some(format!(
                "Cannot find the following branches: {}",
                not_found_branches.join(", ")
            )),
        ));
    }

    if found_branches.is_empty() {
        return Ok(Vec::new());
    }

    let result = Command::new("git")
        .arg("branch")
        .arg("-D")
        .args(branches)
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
            format!("Failed to parse stdout: {}", e),
            "stdout_parse_failed",
            Some(format!("Error parsing git command output to UTF-8: {}", e)),
        )
    })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if !result.status.success() {
        return Err(Error::new(
            format!("Unable to delete branches: {}", path.display()),
            "unable_to_delete_branches",
            Some(stderr),
        ));
    }

    // Parse the output into structured data
    let deleted_branches: Vec<DeletedBranchInfo> = stdout
        .trim()
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|output_line| {
            // Parse "Deleted branch branch_name (was commit_hash)."
            let raw_output = output_line.to_string();
            let branch_name = if let Some(name_part) = output_line.strip_prefix("Deleted branch ") {
                if let Some(end_idx) = name_part.find(" (was ") {
                    name_part[..end_idx].to_string()
                } else {
                    name_part.to_string()
                }
            } else {
                "unknown".to_string()
            };

            let commit_hash = if let Some(idx) = output_line.find(" (was ") {
                let hash_part = &output_line[idx + 6..]; // Skip " (was "
                if let Some(end_idx) = hash_part.find(")") {
                    hash_part[..end_idx].to_string()
                } else {
                    "unknown".to_string()
                }
            } else {
                "unknown".to_string()
            };

            // Get commit information - we use unwrap here but in a better implementation we would handle
            // errors properly. For now, we'll fall back to a default commit if there's an error.
            let commit = match get_last_commit_info(path, &commit_hash) {
                Ok(commit_info) => commit_info,
                Err(_) => Commit {
                    sha: commit_hash.clone(),
                    short_sha: if commit_hash.len() >= 7 {
                        commit_hash[0..7].to_string()
                    } else {
                        "unknown".to_string()
                    },
                    date: "unknown".to_string(),
                    message: "Commit information not available".to_string(),
                    author: "unknown".to_string(),
                    email: "unknown".to_string(),
                },
            };

            DeletedBranchInfo {
                branch: Branch {
                    name: branch_name,
                    fully_merged: false,
                    last_commit: commit,
                    current: false,
                },
                raw_output,
            }
        })
        .collect();

    Ok(deleted_branches)
}

pub fn is_commit_reachable(path: &Path, commit_sha: &str) -> Result<bool, Error> {
    let result = Command::new("git")
        .arg("cat-file")
        .arg("-e")
        .arg(format!("{}^{{commit}}", commit_sha))
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

    // If the command was successful, the commit exists and is reachable
    Ok(result.status.success())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "PascalCase")]
pub enum ConflictResolution {
    Overwrite,
    Rename,
    Skip,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchInput {
    pub original_name: String,
    pub target_name: String,
    pub commit_sha: String,
    pub conflict_resolution: Option<ConflictResolution>,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBranchResult {
    pub success: bool,
    pub branch_name: String,
    pub message: String,
    pub requires_user_action: bool,
    pub conflict_details: Option<ConflictDetails>,
    pub skipped: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ConflictDetails {
    pub original_name: String,
    pub conflicting_name: String,
}

pub fn restore_deleted_branch(
    path: &Path,
    branch_info: &RestoreBranchInput,
) -> Result<RestoreBranchResult, Error> {
    // First check if the commit exists and is reachable
    if !is_commit_reachable(path, &branch_info.commit_sha)? {
        return Ok(RestoreBranchResult {
            success: false,
            branch_name: branch_info.original_name.clone(),
            message: format!(
                "Commit SHA **'{}'** is not reachable in the repository",
                branch_info.commit_sha
            ),
            requires_user_action: false,
            conflict_details: None,
            skipped: false,
        });
    }

    // Check if target name exists
    let target_exists = branch_exists(path, &branch_info.target_name)?;

    // If there's no conflict, proceed with restoration
    if !target_exists {
        let result = Command::new("git")
            .arg("branch")
            .arg(&branch_info.target_name)
            .arg(&branch_info.commit_sha)
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

        if result.status.success() {
            return Ok(RestoreBranchResult {
                success: true,
                branch_name: branch_info.target_name.clone(),
                message: format!("Branch '{}' restored successfully", branch_info.target_name),
                requires_user_action: false,
                conflict_details: None,
                skipped: false,
            });
        } else {
            let stderr = String::from_utf8(result.stderr).map_err(|e| {
                Error::new(
                    format!("Failed to parse stderr: {}", e),
                    "stderr_parse_failed",
                    Some(format!("Error parsing git error output to UTF-8: {}", e)),
                )
            })?;

            return Ok(RestoreBranchResult {
                success: false,
                branch_name: branch_info.target_name.clone(),
                message: format!("Failed to restore branch: {}", stderr),
                requires_user_action: false,
                conflict_details: None,
                skipped: false,
            });
        }
    }

    // Handle name conflict
    if let Some(resolution) = &branch_info.conflict_resolution {
        match resolution {
            ConflictResolution::Overwrite => {
                // First delete the existing branch
                let delete_result = Command::new("git")
                    .arg("branch")
                    .arg("-D")
                    .arg(&branch_info.target_name)
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

                if !delete_result.status.success() {
                    let stderr = String::from_utf8(delete_result.stderr).map_err(|e| {
                        Error::new(
                            format!("Failed to parse stderr: {}", e),
                            "stderr_parse_failed",
                            Some(format!("Error parsing git error output to UTF-8: {}", e)),
                        )
                    })?;

                    return Ok(RestoreBranchResult {
                        success: false,
                        branch_name: branch_info.target_name.clone(),
                        message: format!("Failed to overwrite existing branch: **'{}'**", stderr),
                        requires_user_action: false,
                        conflict_details: None,
                        skipped: false,
                    });
                }

                // Then create new branch
                let create_result = Command::new("git")
                    .arg("branch")
                    .arg(&branch_info.target_name)
                    .arg(&branch_info.commit_sha)
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

                if create_result.status.success() {
                    return Ok(RestoreBranchResult {
                        success: true,
                        branch_name: branch_info.target_name.clone(),
                        message: format!(
                            "Branch '{}' overwritten successfully",
                            branch_info.target_name
                        ),
                        requires_user_action: false,
                        conflict_details: None,
                        skipped: false,
                    });
                } else {
                    let stderr = String::from_utf8(create_result.stderr).map_err(|e| {
                        Error::new(
                            format!("Failed to parse stderr: {}", e),
                            "stderr_parse_failed",
                            Some(format!("Error parsing git error output to UTF-8: {}", e)),
                        )
                    })?;

                    return Ok(RestoreBranchResult {
                        success: false,
                        branch_name: branch_info.target_name.clone(),
                        message: format!("Failed to create branch after overwrite: {}", stderr),
                        requires_user_action: false,
                        conflict_details: None,
                        skipped: false,
                    });
                }
            }
            ConflictResolution::Rename => {
                // Create branch with new name
                let result = Command::new("git")
                    .arg("branch")
                    .arg(&branch_info.target_name)
                    .arg(&branch_info.commit_sha)
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

                if result.status.success() {
                    return Ok(RestoreBranchResult {
                        success: true,
                        branch_name: branch_info.target_name.clone(),
                        message: format!(
                            "Branch restored with name **'{}'**",
                            branch_info.target_name
                        ),
                        requires_user_action: false,
                        conflict_details: None,
                        skipped: false,
                    });
                } else {
                    let stderr = String::from_utf8(result.stderr).map_err(|e| {
                        Error::new(
                            format!("Failed to parse stderr: {}", e),
                            "stderr_parse_failed",
                            Some(format!("Error parsing git error output to UTF-8: {}", e)),
                        )
                    })?;

                    return Ok(RestoreBranchResult {
                        success: false,
                        branch_name: branch_info.target_name.clone(),
                        message: format!(
                            "Failed to restore branch with new name: **'{}'**",
                            stderr
                        ),
                        requires_user_action: false,
                        conflict_details: None,
                        skipped: false,
                    });
                }
            }
            ConflictResolution::Skip => {
                return Ok(RestoreBranchResult {
                    success: true,
                    branch_name: branch_info.target_name.clone(),
                    message: format!(
                        "Skipped restoration of branch **'{}'**",
                        branch_info.target_name
                    ),
                    requires_user_action: false,
                    conflict_details: None,
                    skipped: true,
                });
            }
        }
    } else {
        // No conflict resolution provided, require user action
        return Ok(RestoreBranchResult {
            success: false,
            branch_name: branch_info.target_name.clone(),
            message: format!(
                "Branch name **'{}'** already exists",
                branch_info.target_name
            ),
            requires_user_action: true,
            conflict_details: Some(ConflictDetails {
                original_name: branch_info.original_name.clone(),
                conflicting_name: branch_info.target_name.clone(),
            }),
            skipped: false,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[test]
    fn test_branch_exists() {
        // Save current directory and restore it at the end to avoid affecting other tests
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();

        // Get current branch
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Test our function - the current branch should exist
        let result = branch_exists(path, &current_branch);
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Test with a non-existent branch
        let result = branch_exists(path, "non-existent-branch");
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_get_current_branch() {
        // Save current directory
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();

        // Get the current branch directly with git
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let expected = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Test our function
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
        // Save current directory
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();

        // Get current branch
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Get all branches with last commit
        let branches = get_all_branches_with_last_commit(path);
        assert!(
            branches.is_ok(),
            "get_all_branches_with_last_commit failed: {:?}",
            branches.err()
        );
        let branches = branches.unwrap();

        assert!(!branches.is_empty(), "No branches returned");

        // Verify current branch is marked correctly
        let current = branches.iter().find(|b| b.name == current_branch);
        assert!(current.is_some(), "Current branch not found in results");
        assert!(
            current.unwrap().current,
            "Current branch not marked as current"
        );

        // Verify commit information exists
        assert!(
            !current.unwrap().last_commit.sha.is_empty(),
            "Commit SHA is empty"
        );
        assert!(
            !current.unwrap().last_commit.message.is_empty(),
            "Commit message is empty"
        );
    }

    #[test]
    fn test_switch_branch() {
        // Save current directory
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();

        // Make sure we're in the repository directory
        std::env::set_current_dir(path).unwrap();

        // Get current branch
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let original_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        println!("Current branch is: {}", original_branch);

        // Create a new test branch using checkout -b to ensure it exists
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

        // Verify we're on the test branch with git directly
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current = String::from_utf8(output.stdout).unwrap().trim().to_string();
        assert_eq!(current, "test-branch", "Failed to checkout test-branch");

        // Switch back to the original branch with our function
        println!("Switching to original branch: {}", original_branch);
        let result = switch_branch(path, &original_branch);
        assert!(result.is_ok(), "Failed to switch back: {:?}", result.err());

        // Verify current branch name from the result
        let switched_branch = result.unwrap();
        assert_eq!(
            switched_branch, original_branch,
            "Returned branch name doesn't match"
        );

        // Verify we're actually on the original branch with git directly
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current = String::from_utf8(output.stdout).unwrap().trim().to_string();
        assert_eq!(
            current, original_branch,
            "Failed to switch to original branch"
        );

        // Now try switching to test-branch with our function
        println!("Switching to test-branch using our function...");
        let result = switch_branch(path, "test-branch");
        assert!(result.is_ok(), "switch_branch failed: {:?}", result.err());

        // Verify the returned branch name
        let switched_branch = result.unwrap();
        assert_eq!(
            switched_branch, "test-branch",
            "Returned branch name doesn't match"
        );

        // Also verify with git directly
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current = String::from_utf8(output.stdout).unwrap().trim().to_string();
        assert_eq!(current, "test-branch", "Failed to switch to test-branch");
    }

    #[test]
    fn test_delete_branches() {
        // Save current directory
        let _guard = DirectoryGuard::new();

        let repo = setup_test_repo();
        let path = repo.path();

        // Get current branch
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();
        println!("Current branch is: {}", current_branch);

        // Create a branch to delete using checkout -b which is more reliable
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

        // Switch back to the original branch so we can delete the new branch
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

        // Verify branch exists
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

        // Delete the branch with our function
        println!("Deleting branch-to-delete...");
        let branches_to_delete = vec!["branch-to-delete".to_string()];
        let result = delete_branches(path, &branches_to_delete);
        assert!(result.is_ok(), "delete_branches failed: {:?}", result.err());

        // Verify the branch was deleted
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

    #[test]
    fn test_is_commit_reachable() {
        // Save current directory
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

        // Test with a valid commit SHA
        let result = is_commit_reachable(path, &commit_sha);
        assert!(result.is_ok());
        assert!(
            result.unwrap(),
            "The current HEAD commit should be reachable"
        );

        // Test with an invalid commit SHA
        let invalid_sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
        let result = is_commit_reachable(path, invalid_sha);
        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "A non-existent commit should not be reachable"
        );
    }

    #[test]
    fn test_restore_deleted_branch() {
        // Save current directory
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
            .args(["branch", "test-branch-to-delete"])
            .current_dir(path)
            .output()
            .unwrap();

        // Verify the branch exists
        assert!(branch_exists(path, "test-branch-to-delete").unwrap());

        // Delete the branch
        let _ = Command::new("git")
            .args(["branch", "-D", "test-branch-to-delete"])
            .current_dir(path)
            .output()
            .unwrap();

        // Verify the branch is gone
        assert!(!branch_exists(path, "test-branch-to-delete").unwrap());

        // Test restoring the branch
        let restore_input = RestoreBranchInput {
            original_name: "test-branch-to-delete".to_string(),
            target_name: "test-branch-to-delete".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &restore_input);
        assert!(result.is_ok());
        let restore_result = result.unwrap();
        assert!(restore_result.success);
        assert_eq!(restore_result.branch_name, "test-branch-to-delete");
        assert!(!restore_result.skipped);

        // Verify the branch is back
        assert!(branch_exists(path, "test-branch-to-delete").unwrap());

        // Test conflict handling
        let conflict_input = RestoreBranchInput {
            original_name: "test-branch-to-delete".to_string(),
            target_name: "test-branch-to-delete".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &conflict_input);
        assert!(result.is_ok());
        let conflict_result = result.unwrap();
        assert!(!conflict_result.success);
        assert!(conflict_result.requires_user_action);
        assert!(conflict_result.conflict_details.is_some());
        assert!(!conflict_result.skipped);

        // Test skip conflict resolution
        let skip_input = RestoreBranchInput {
            original_name: "test-branch-to-delete".to_string(),
            target_name: "test-branch-to-delete".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: Some(ConflictResolution::Skip),
        };

        let result = restore_deleted_branch(path, &skip_input);
        assert!(result.is_ok());
        let skip_result = result.unwrap();
        assert!(skip_result.success);
        assert!(skip_result.skipped);
    }
}

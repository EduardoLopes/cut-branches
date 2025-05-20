use std::io::ErrorKind;
use std::path::Path;
use std::process::Command;

use crate::error::Error;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Commit {
    pub hash: String,
    pub date: String,
    pub message: String,
    pub author: String,
    pub email: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
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
            None,
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
            None,
        )
    })?;

    if result.status.success() {
        let output = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                None,
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
                        hash: parts[1].to_string(),
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
            None,
        )
    })?;

    if result.status.success() {
        let current_branch = String::from_utf8(result.stdout)
            .map_err(|e| {
                Error::new(
                    format!("Failed to parse stdout: {}", e),
                    "stdout_parse_failed",
                    None,
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
            None,
        )
    })?;

    if result.status.success() {
        let commit_info = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                None,
            )
        })?;
        let commit_info = commit_info.trim().split('|').collect::<Vec<_>>();

        if commit_info.len() == 5 {
            return Ok(Commit {
                hash: commit_info[0].to_string(),
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
            None,
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
            None,
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

pub fn delete_branches(path: &Path, branches: &[String]) -> Result<Vec<String>, Error> {
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
            None,
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
            None,
        )
    })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr: {}", e),
            "stderr_parse_failed",
            None,
        )
    })?;

    if !result.status.success() {
        return Err(Error::new(
            format!("Unable to delete branches: {}", path.display()),
            "unable_to_delete_branches",
            Some(stderr),
        ));
    }

    let branches_deleted = stdout
        .trim()
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect::<Vec<_>>();

    Ok(branches_deleted)
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
            !current.unwrap().last_commit.hash.is_empty(),
            "Commit hash is empty"
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
}

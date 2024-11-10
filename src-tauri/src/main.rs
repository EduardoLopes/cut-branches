#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

mod error;
mod path;

use error::Error;
use path::set_current_dir;

use std::process::Command;

use std::path::Path;
#[derive(serde::Serialize, Clone)]
pub struct Commit {
    hash: String,
    date: String,
    message: String,
    author: String,
    email: String,
}

#[derive(serde::Serialize, Clone)]
pub struct Branch {
    name: String,
    fully_merged: bool,
    last_commit: Commit,
    current: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GitDirResponse {
    path: String,
    branches: Vec<Branch>,
    current_branch: String,
    branches_count: usize,
    name: String,
    id: String,
}

// This function returns a vector of all branches in a git repository.
// It receives a path to the repository.
// It returns a Result containing a vector of strings with the branches or an Error with a message, a description and a kind.
pub fn get_branches(path: &Path) -> Result<Vec<String>, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git").arg("branch").output().unwrap();

    let stderr = String::from_utf8(result.stderr).unwrap();

    if result.status.success() {
        let all_branches = String::from_utf8(result.stdout).unwrap();
        return Ok(all_branches
            .split("\n")
            .map(|s| s.trim().replace("* ", ""))
            .filter(|s| !s.is_empty())
            .collect());
    }

    // we need to check what really happens when a git repo has no branches
    Err(Error {
        message: format!(
            "We couldn't find branches in the path **{0}**",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_branches".to_string(),
    })
}

pub fn get_all_branches_with_last_commit(path: &Path) -> Result<Vec<Branch>, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("for-each-ref")
        .arg("--format=%(refname:short)|%(objectname)|%(committerdate)|%(contents:subject)|%(authorname)|%(authoremail)")
        .arg("refs/heads/")
        .output()
        .map_err(|e| Error {
            message: format!("Failed to execute git command: {}", e),
            description: None,
            kind: "command_execution_failed".to_string(),
        })?;
    let merged_result = Command::new("git")
        .arg("branch")
        .arg("--merged")
        .output()
        .map_err(|e| Error {
            message: format!("Failed to execute git command: {}", e),
            description: None,
            kind: "command_execution_failed".to_string(),
        })?;

    let merged_branches = String::from_utf8(merged_result.stdout).map_err(|e| Error {
        message: format!("Failed to parse stdout: {}", e),
        description: None,
        kind: "stdout_parse_failed".to_string(),
    })?;

    let merged_branches: Vec<String> = merged_branches
        .split("\n")
        .map(|s| s.trim().replace("* ", ""))
        .filter(|s| !s.is_empty())
        .collect();

    let stderr = String::from_utf8(result.stderr).map_err(|e| Error {
        message: format!("Failed to parse stderr: {}", e),
        description: None,
        kind: "stderr_parse_failed".to_string(),
    })?;

    if result.status.success() {
        let output = String::from_utf8(result.stdout).map_err(|e| Error {
            message: format!("Failed to parse stdout: {}", e),
            description: None,
            kind: "stdout_parse_failed".to_string(),
        })?;

        let current_branch = get_current_branch(path)?;

        let mut branches: Vec<Branch> = output
            .trim()
            .split("\n")
            .map(|line| {
                let parts: Vec<&str> = line.split("|").collect();
                let branch_name = parts[0].to_string();

                Branch {
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
                }
            })
            .collect();

        branches.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        return Ok(branches);
    }

    Err(Error {
        message: format!(
            "Couldn't retrieve branches with last commit info in the path **{0}**",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_branches".to_string(),
    })
}

// This function returns a vector of all branches in a git repository that are not merged.
// It receives a path to the repository.
// It returns a Result containing a vector of strings with the branches or an Error with a message, a description and a kind.
pub fn get_branches_no_merged(path: &Path) -> Result<Vec<String>, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("branch")
        .arg("--no-merged")
        .output()
        .unwrap();

    let stderr = String::from_utf8(result.stderr).unwrap();

    if result.status.success() {
        let all_branches = String::from_utf8(result.stdout).unwrap();
        return Ok(all_branches
            .split("\n")
            .map(|s| s.trim().replace("* ", ""))
            .filter(|s| !s.is_empty())
            .collect());
    }

    // we need to check what really happens when a git repo has no branches
    Err(Error {
        message: format!(
            "Couldn't find branches not merged in the path **{0}**",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_branches".to_string(),
    })
}

// This function returns the name of the current branch in a git repository.
// It receives a path to the repository.
// It returns a Result containing a string with the current branch or an Error with a message, a description and a kind.
pub fn get_current_branch(path: &Path) -> Result<String, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .output()
        .unwrap();

    let stderr = String::from_utf8(result.stderr).unwrap();

    if result.status.success() {
        let current_branch = String::from_utf8(result.stdout).unwrap().trim().to_string();
        return Ok(current_branch);
    }

    Err(Error {
        message: format!(
            "Couldn't find the current branch in the path **{0}**",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_branches".to_string(),
    })
}

pub fn get_last_commit_info(path: &Path, branch: &str) -> Result<Commit, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("log")
        .arg("-1")
        .arg("--pretty=format:%H|%ad|%s|%an|%ae")
        .arg(branch)
        .output()
        .map_err(|e| Error {
            message: format!("Failed to execute git command: {}", e),
            description: None,
            kind: "command_execution_failed".to_string(),
        })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| Error {
        message: format!("Failed to parse stderr: {}", e),
        description: None,
        kind: "stderr_parse_failed".to_string(),
    })?;

    if result.status.success() {
        let commit_info = String::from_utf8(result.stdout).map_err(|e| Error {
            message: format!("Failed to parse stdout: {}", e),
            description: None,
            kind: "stdout_parse_failed".to_string(),
        })?;
        let commit_info = commit_info.trim().split("|").collect::<Vec<_>>();

        if commit_info.len() == 5 {
            return Ok(Commit {
                hash: commit_info[0].to_string(),
                date: commit_info[1].to_string(),
                message: commit_info[2].to_string(),
                author: commit_info[3].to_string(),
                email: commit_info[4].to_string(),
            });
        } else {
            return Err(Error {
                message: "Unexpected commit info format".to_string(),
                description: Some(commit_info.join("|")),
                kind: "unexpected_format".to_string(),
            });
        }
    }

    Err(Error {
        message: format!(
            "Couldn't find the last commit in the path **{0}**",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_commit".to_string(),
    })
}

// This function returns a JSON string with information about a git repository.
// It receives a path to the repository.
// It returns a Result containing a string with the JSON or an Error with a message, a description and a kind.
#[tauri::command(async)]
async fn get_repo_info(path: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    path::is_git_repository(&raw_path)?;

    let unserialized_root_path: String = path::get_root(path.clone()).await?;

    let root_path = serde_json::from_str::<path::RootPathResponse>(&unserialized_root_path)
        .map_err(|e| Error {
            message: format!("Failed to parse root path response: {}", e),
            description: None,
            kind: "parse_failed".to_string(),
        })?
        .root_path;

    let raw_root_path = Path::new(&root_path);

    path::set_current_dir(&raw_root_path)?;

    let mut branches = get_all_branches_with_last_commit(&raw_root_path)?;
    branches.sort_by(|a, b| b.current.cmp(&a.current));
    let current = get_current_branch(&raw_root_path)?;

    let repo_name = raw_root_path
        .file_name()
        .ok_or_else(|| Error {
            message: "Failed to get repository name".to_string(),
            description: None,
            kind: "repo_name_failed".to_string(),
        })?
        .to_str()
        .ok_or_else(|| Error {
            message: "Failed to convert repository name to string".to_string(),
            description: None,
            kind: "repo_name_failed".to_string(),
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

    Ok(serde_json::to_string(&response).map_err(|e| Error {
        message: format!("Failed to serialize response: {}", e),
        description: None,
        kind: "serialization_failed".to_string(),
    })?)
}

// This function switches to another branch in a git repository.
// It receives a path to the repository and the name of the branch to switch to.
// It returns a Result containing a string with the new current branch or an Error with a message, a description and a kind.
#[tauri::command(async)]
async fn switch_branch(path: String, branch: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    set_current_dir(&raw_path)?;

    // Check if the branch exists
    let branch_exists = branch_exists(path.clone(), branch.clone()).unwrap();
    if !branch_exists {
        return Err(Error {
            message: format!("Branch **{0}** not found", branch),
            description: None,
            kind: "branch_not_found".to_string(),
        });
    }

    // Execute the git command to switch branches
    let result = Command::new("git")
        .arg("switch")
        .arg(&branch)
        .output()
        .map_err(|e| Error {
            message: format!("Failed to execute git command: {}", e),
            description: None,
            kind: "command_execution_failed".to_string(),
        })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| Error {
        message: format!("Failed to parse stderr: {}", e),
        description: None,
        kind: "stderr_parse_failed".to_string(),
    })?;

    if result.status.success() {
        let current_branch = get_current_branch(&raw_path)?;
        return Ok(current_branch);
    }

    Err(Error {
        message: format!(
            "Couldn't switch to branch **{0}** in the path **{1}**",
            branch, path
        ),
        description: Some(stderr),
        kind: "switch_branch_failed".to_string(),
    })
}

// #[derive(serde::Serialize)]
// struct DeleteBranchesResponse {
//     branches: String,
// }

// This function checks if a branch exists in a git repository.
// It receives a path to the repository and the name of the branch to be checked.
// It returns an Option containing a boolean indicating whether the branch exists or not.
fn branch_exists(path: String, branch_name: String) -> Result<bool, Error> {
    let raw_path = Path::new(&path);

    // Set the current working directory to the repository path.
    set_current_dir(&raw_path)?;

    // Execute the git command to verify if the branch exists.
    let result = Command::new("git")
        .arg("show-ref")
        .arg("--verify")
        .arg(format!("refs/heads/{}", branch_name))
        .output()
        .map_err(|e| Error {
            message: format!("Failed to execute git command: {}", e),
            description: None,
            kind: "command_execution_failed".to_string(),
        })?;

    // Return a Result containing a boolean indicating whether the branch exists or not.
    Ok(result.status.success())
}

// This function deletes branches from a git repository.
// It receives a path to the repository and a vector of branch names to be deleted.
// It returns a Result containing a string with the deleted branches or an Error with a message, a description and a kind.
#[tauri::command(async)]
async fn delete_branches(path: String, branches: Vec<String>) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    set_current_dir(&raw_path)?;

    let mut not_found_branches: Vec<String> = Vec::new();
    let mut found_branches: Vec<String> = Vec::new();

    // Check if each branch exists in the repository.
    // If it doesn't exist, add it to the not_found_branches vector.
    for branch in &branches {
        if !branch_exists(path.clone(), branch.to_string()).unwrap() {
            not_found_branches.push(branch.to_string());
        }
    }

    // Check if each branch exists in the repository.
    // If it exists, add it to the found_branches vector.
    for branch in &branches {
        if branch_exists(path.clone(), branch.to_string()).unwrap() {
            found_branches.push(branch.to_string());
        }
    }

    // If there are branches that were not found in the repository, return an Error.
    if not_found_branches.len() > 0 {
        return Err(Error {
            message: format!(
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
            description: None,
            kind: "branches_not_found".to_string(),
        });
    }

    // Delete the branches using the git command if all branches exists
    let result = Command::new("git")
        .arg("branch")
        .arg("-D")
        .args(branches)
        .output()
        .unwrap();

    let stdout: String = String::from_utf8(result.stdout).unwrap();
    let stderr = String::from_utf8(result.stderr).unwrap();

    // If the command was not successful, return an Error.
    if !result.status.success() {
        return Err(Error {
            message: format!("Unable to delete branches: {0}", raw_path.display()),
            description: Some(stderr),
            kind: "unable_to_delete_branches".to_string(),
        });
    }

    // Return a string with the deleted branches.
    let branches_deleted = stdout.trim().split("\n").collect::<Vec<_>>();

    Ok(serde_json::to_string(&branches_deleted).unwrap())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_repo_info,
            path::get_root,
            delete_branches,
            switch_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

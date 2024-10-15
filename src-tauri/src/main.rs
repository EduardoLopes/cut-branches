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

#[derive(serde::Serialize)]
struct Branch {
    name: String,
    fully_merged: bool,
    current: bool,
}

#[derive(serde::Serialize)]
struct GitDirResponse {
    root_path: String,
    branches: Vec<Branch>,
    current_branch: String,
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
            "We couldn't find branches in the path <strong>{0}</strong>",
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
            "Couldn't find branches not merged in the path <strong>{0}</strong>",
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
        .arg("branch")
        .arg("--show-current")
        .output()
        .unwrap();

    let stderr = String::from_utf8(result.stderr).unwrap();

    if result.status.success() {
        let current_branch = String::from_utf8(result.stdout).unwrap().trim().to_string();
        return Ok(current_branch);
    }

    // we need to check what really happens when a git repo has no branches
    Err(Error {
        message: format!(
            "Couldn't find the current branch in the path <strong>{0}</strong>",
            path.display()
        ),
        description: Some(stderr),
        kind: "no_branches".to_string(),
    })
}

// This function returns a JSON string with information about a git repository.
// It receives a path to the repository.
// It returns a Result containing a string with the JSON or an Error with a message, a description and a kind.
#[tauri::command(async)]
async fn get_repo_info(path: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    path::is_git_repository(&raw_path)?;

    let unserialized_root_path: String = path::get_root(path).await?;

    let root_path = serde_json::from_str::<path::RootPathResponse>(&unserialized_root_path)
        .unwrap()
        .root_path;

    let raw_root_path = Path::new(&root_path);

    path::set_current_dir(&raw_root_path)?;

    let all_branches = get_branches(&raw_root_path)?;
    let all_branches_no_merged: Vec<String> = get_branches_no_merged(&raw_root_path)?;
    let current = get_current_branch(&raw_root_path)?;

    let mut branches: Vec<Branch> = Vec::new();

    for branch in &all_branches {
        branches.push(Branch {
            name: branch.to_string(),
            fully_merged: all_branches_no_merged.contains(branch),
            current: &current == branch,
        });
    }

    let response = GitDirResponse {
        root_path,
        branches: branches,
        current_branch: current.to_string(),
    };

    Ok(serde_json::to_string(&response).unwrap())
}

// #[derive(serde::Serialize)]
// struct DeleteBranchesResponse {
//     branches: String,
// }

// This function checks if a branch exists in a git repository.
// It receives a path to the repository and the name of the branch to be checked.
// It returns an Option containing a boolean indicating whether the branch exists or not.
fn branch_exists(path: String, branch_name: String) -> Option<bool> {
    let raw_path = Path::new(&path);

    // Set the current working directory to the repository path.
    set_current_dir(&raw_path).unwrap();

    // Execute the git command to verify if the branch exists.
    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--verify")
        .arg(&branch_name)
        .output()
        .unwrap();

    // Return an Option containing a boolean indicating whether the branch exists or not.
    Some(result.status.success())
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
                "Branch{2} not found: <strong>{0}</strong>. The branch{3} <strong>{1}</strong> still exists",
                not_found_branches.join(", "),
                found_branches.join(", "),
                if not_found_branches.len() == 1 { "" } else { "es" },
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_repo_info,
            path::get_root,
            delete_branches
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

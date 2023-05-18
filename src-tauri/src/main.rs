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

use std::env;
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
    errors: Vec<String>,
    current_branch: String,
}

#[tauri::command(async)]
async fn git_repo_dir(path: String) -> Result<String, Error> {
    let mut errors: Vec<String> = Vec::new();

    let raw_path = Path::new(&path);

    path::set_current_dir(&raw_path)?;

    path::is_git_repository(&raw_path)?;

    let dir_child = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .output()
        .expect("Failed to execute command");

    let root_path: String = match String::from_utf8(dir_child.stdout) {
        Ok(output) => Some(output.trim().to_string()),
        Err(err) => {
            let e = format!("{:?}", err);
            errors.push(e);

            None
        }
    }
    .unwrap();

    let raw_root_path = Path::new(&root_path);

    // printlnln!("root_path: {}", root_path);
    // printlnln!("raw_root_path: {:?}", raw_root_path);
    // printlnln!("raw_path: {:?}", raw_path);

    env::set_current_dir(&raw_root_path).unwrap_or_else(|error| {
        errors.push(format!(
            "Unable to change into: {0} | {1}",
            error,
            raw_root_path.display()
        ));
    });

    let branch_child = Command::new("git")
        .arg("branch")
        .output()
        .expect("Failed to execute command");

    let all_branches = String::from_utf8(branch_child.stdout).unwrap();

    errors.push(String::from_utf8(branch_child.stderr).unwrap());

    let all_branches_vec: Vec<String> = all_branches
        .split("\n")
        .map(|s| s.trim().replace("* ", ""))
        .filter(|s| !s.is_empty())
        .collect();

    let branch_no_merged_child = Command::new("git")
        .arg("branch")
        .arg("--no-merged")
        .output()
        .expect("Failed to execute command");

    let branch_no_merged_child_output = branch_no_merged_child.stdout;

    errors.push(String::from_utf8(branch_no_merged_child.stderr).unwrap());

    let all_branches_no_merged = String::from_utf8(branch_no_merged_child_output).unwrap();

    let all_branches_no_merged_vec: Vec<String> = all_branches_no_merged
        .split("\n")
        .map(|s| s.trim().replace("* ", ""))
        .filter(|s| !s.is_empty())
        .collect();

    let branch_current_child = Command::new("git")
        .arg("branch")
        .arg("--show-current")
        .output()
        .expect("Failed to execute command");

    let branch_current_child_output = branch_current_child.stdout;

    errors.push(String::from_utf8(branch_current_child.stderr).unwrap());

    let current_branch = String::from_utf8(branch_current_child_output).unwrap();

    let current = current_branch.trim();

    let mut branches: Vec<Branch> = Vec::new();

    for branch in &all_branches_vec {
        branches.push(Branch {
            name: branch.to_string(),
            fully_merged: all_branches_no_merged_vec.contains(branch),
            current: &current == branch,
        });
    }

    let response = GitDirResponse {
        root_path,
        branches: branches,
        errors: errors
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>(),
        current_branch: current.to_string(),
    };

    // for testing
    // let ten_millis = std::time::Duration::from_millis(1000);
    // std::thread::sleep(ten_millis);

    Ok(serde_json::to_string(&response).unwrap())
}

#[derive(serde::Serialize)]
struct DeleteBranchesResponse {
    branches: String,
}

fn branch_exists(path: String, branch_name: String) -> Option<bool> {
    let raw_path = Path::new(&path);

    set_current_dir(&raw_path).unwrap();

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--verify")
        .arg(&branch_name)
        .output()
        .unwrap();

    Some(result.status.success())
}

#[tauri::command(async)]
async fn delete_branches(path: String, branches: Vec<String>) -> Result<String, Error> {
    let raw_path = Path::new(&path);

    set_current_dir(&raw_path)?;

    let mut not_found_branches: Vec<String> = Vec::new();
    let mut found_branches: Vec<String> = Vec::new();

    for branch in &branches {
        if !branch_exists(path.clone(), branch.to_string()).unwrap() {
            not_found_branches.push(branch.to_string());
        }
    }

    for branch in &branches {
        if branch_exists(path.clone(), branch.to_string()).unwrap() {
            found_branches.push(branch.to_string());
        }
    }

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

    let result = Command::new("git")
        .arg("branch")
        .arg("-D")
        .args(branches)
        .output()
        .unwrap();

    let stdout: String = String::from_utf8(result.stdout).unwrap();
    let stderr = String::from_utf8(result.stderr).unwrap();

    if !result.status.success() {
        return Err(Error {
            message: format!("Unable to delete branches: {0}", raw_path.display()),
            description: Some(stderr),
            kind: "unable_to_delete_branches".to_string(),
        });
    }

    let branches_deleted = stdout.trim().split("\n").collect::<Vec<_>>();

    Ok(serde_json::to_string(&branches_deleted).unwrap())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            git_repo_dir,
            path::get_root,
            delete_branches
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

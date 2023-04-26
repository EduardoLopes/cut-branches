#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

mod error;
mod path;

use error::Error;

use std::process::Command;

use std::env;
use std::path::Path;

use serde::Deserialize;

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

fn set_current_dir(path: &Path) -> Result<(), Error> {
    env::set_current_dir(&path).map_err(|error| Error {
        message: format!(
            "Unable to change into the path: <strong>{0}</strong>",
            path.display()
        ),
        description: Some(error.to_string()),
        kind: "set_current_dir".to_string(),
    })
}

#[tauri::command(async)]
async fn git_repo_dir(path: String) -> Result<String, Error> {
    let mut errors: Vec<String> = Vec::new();

    let raw_path = Path::new(&path);

    set_current_dir(&raw_path)?;

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

    // println!("root_path: {}", root_path);
    // println!("raw_root_path: {:?}", raw_root_path);
    // println!("raw_path: {:?}", raw_path);

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
        root_path: root_path,
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

#[derive(Deserialize)]
struct DeleteOptions<'a>(&'a str, String);

#[derive(serde::Serialize)]
struct DeleteBranchesResponse {
    result: String,
    errors: String,
}

#[tauri::command(async)]
fn delete_branches(DeleteOptions(path, branches): DeleteOptions) -> String {
    let raw_path = Path::new(&path);
    // let mut errors: Vec<String> = Vec::new();

    env::set_current_dir(&raw_path).expect("Unable to change into");

    // println!("path: {}", path);
    // println!("branches: {}", branches);

    let args: Vec<_> = branches.split(" ").collect();

    let child = Command::new("git")
        .arg("branch")
        .arg("-D")
        .args(args)
        .output()
        .expect("Failed to execute command");

    let response = DeleteBranchesResponse {
        result: String::from_utf8(child.stdout).unwrap(),
        errors: String::from_utf8(child.stderr).unwrap(),
    };

    return serde_json::to_string(&response).unwrap();
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

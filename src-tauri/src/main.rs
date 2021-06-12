#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

extern crate execute;

use std::process::Command;

use std::env;
use std::path::Path;

use serde::Deserialize;

#[derive(serde::Serialize)]
struct GitDirResponse {
  root_path: String,
  branches: String,
}

#[tauri::command]
fn git_repo_dir(path: String) -> String {
  let raw_path = Path::new(&path);
  env::set_current_dir(&raw_path).expect("Unable to change into");

  let dir_child = Command::new("git")
    .arg("rev-parse")
    .arg("--show-toplevel")
    .output()
    .expect("Failed to execute command");

  let root_path = String::from_utf8(dir_child.stdout)
    .unwrap()
    .replace("\n", "");

  let raw_root_path = Path::new(&root_path);

  // println!("root_path: {}", root_path);
  // println!("raw_root_path: {}", raw_root_path.display());
  // println!("raw_path: {}", raw_path.display());

  env::set_current_dir(&raw_root_path).expect("Unable to change into");

  let branch_child = Command::new("git")
    .arg("branch")
    .output()
    .expect("Failed to execute command");

  let branches = String::from_utf8(branch_child.stdout).unwrap();

  let response = GitDirResponse {
    root_path: root_path,
    branches: branches,
  };

  return serde_json::to_string(&response).unwrap();
}

#[derive(Deserialize)]
struct DeleteOptions<'a>(&'a str, String);

#[tauri::command]
fn delete_branches(DeleteOptions(path, branches): DeleteOptions) {
  let raw_path = Path::new(&path);
  env::set_current_dir(&raw_path).expect("Unable to change into");

  // println!("path: {}", path);
  // println!("branches: {}", branches);

  Command::new("git")
    .arg("branch")
    .arg("-D")
    .arg(branches)
    .output()
    .expect("Failed to execute command");

  // println!("out: {}", String::from_utf8(out.stdout).unwrap());
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![git_repo_dir, delete_branches])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

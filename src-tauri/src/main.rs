#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

extern crate execute;

use std::process::Command;

use std::env;
use std::path::Path;

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

  let root_path = String::from_utf8(dir_child.stdout).unwrap();

  // if cfg!(windows) {
  //   println!("this is windows");
  // }

  // println!("root_path: {}", root_path);
  // println!("path: {}", path);

  // let raw_root_path = Path::new(&root_path);

  // println!("raw_root_path: {}", raw_root_path.display());
  // println!("raw_path: {}", raw_path.display());

  env::set_current_dir(&raw_path).expect("Unable to change into");

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

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![git_repo_dir])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

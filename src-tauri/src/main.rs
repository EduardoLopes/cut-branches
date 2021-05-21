#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

extern crate execute;

use std::process::Stdio;

use execute::{shell, Execute};

#[derive(serde::Serialize)]
struct GitDirResponse {
  absolute_path: String,
  root_path: String,
}

#[tauri::command]
fn git_repo_dir(path: String) -> String {
  let mut command = shell(format!("cd {} && git rev-parse --git-dir", path));

  command.stdout(Stdio::piped());

  let output = command.execute_output().unwrap();

  let absolute_path = String::from_utf8(output.stdout).unwrap();

  let root_path = absolute_path.replace(".git", "");

  let response = GitDirResponse {
    absolute_path,
    root_path,
  };

  return serde_json::to_string(&response).unwrap();
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![git_repo_dir])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

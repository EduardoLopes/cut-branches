#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

mod commands;
mod error;
mod git;
mod path;
#[cfg(test)]
pub mod test_utils;

use commands::{
    delete_branches, get_repo_info, is_commit_reachable, restore_deleted_branch, switch_branch,
};
use path::get_root;

fn main() {
    let _ = fix_path_env::fix();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_root,
            get_repo_info,
            switch_branch,
            delete_branches,
            is_commit_reachable,
            restore_deleted_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

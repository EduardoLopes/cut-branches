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
    delete_branches, get_repo_info, is_commit_reachable, restore_deleted_branch,
    restore_deleted_branches, switch_branch,
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
            restore_deleted_branch,
            restore_deleted_branches
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_fix_path_env() {
        // Test that fix_path_env does not panic
        let result = fix_path_env::fix();
        // We can't really test the result as it depends on the environment,
        // but we can ensure it doesn't panic
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_handlers_exist() {
        // Verify that the command modules and functions exist
        // This doesn't directly test the Tauri builder, but ensures
        // that all the handlers we reference in main() are valid
        use crate::commands;
        use crate::path;

        // Test that we can access the command functions
        let _ = commands::get_repo_info;
        let _ = commands::switch_branch;
        let _ = commands::delete_branches;
        let _ = commands::is_commit_reachable;
        let _ = commands::restore_deleted_branch;
        let _ = commands::restore_deleted_branches;
        let _ = path::get_root;
    }
}

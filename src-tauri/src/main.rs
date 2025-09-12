#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

pub mod commands;
pub mod error;
pub mod events;
pub mod git;
pub mod path;
#[cfg(test)]
pub mod test_utils;

use commands::{
    delete_branches, get_repo_info, is_commit_reachable, restore_deleted_branch,
    restore_deleted_branches, switch_branch,
};
use events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent, NotificationEvent,
    RepositoryLoadedEvent,
};
use path::get_root;

fn main() {
    let _ = fix_path_env::fix();

    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            get_root,
            get_repo_info,
            switch_branch,
            delete_branches,
            is_commit_reachable,
            restore_deleted_branch,
            restore_deleted_branches
        ])
        .events(tauri_specta::collect_events![
            BranchDeletedEvent,
            BranchRestoredEvent,
            BranchSwitchedEvent,
            RepositoryLoadedEvent,
            NotificationEvent
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(specta_typescript::Typescript::default(), "../src/lib/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
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

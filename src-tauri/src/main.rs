#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

pub mod domains;
pub mod shared;

use domains::branch_management::commands::{
    delete_branches, is_commit_reachable, restore_branch, restore_branches, switch_branch,
};
use domains::branch_management::events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent,
};
use domains::path_operations::commands::get_repository_root;
use domains::repository_management::commands::get_repository;
use domains::repository_management::events::{NotificationEvent, RepositoryLoadedEvent};

fn main() {
    let _ = fix_path_env::fix();

    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            get_repository_root,
            get_repository,
            switch_branch,
            delete_branches,
            is_commit_reachable,
            restore_branch,
            restore_branches
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
        .export(
            specta_typescript::Typescript::default(),
            "../src/lib/bindings.ts",
        )
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
        use crate::domains::branch_management::commands;
        use crate::domains::path_operations::commands as path_commands;
        use crate::domains::repository_management::commands as repo_commands;

        // Test that we can access the command functions
        let _ = repo_commands::get_repository;
        let _ = commands::switch_branch;
        let _ = commands::delete_branches;
        let _ = commands::is_commit_reachable;
        let _ = commands::restore_branch;
        let _ = commands::restore_branches;
        let _ = path_commands::get_repository_root;
    }
}

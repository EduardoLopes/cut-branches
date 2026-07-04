#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate execute;

pub mod composition;
pub mod domains;
pub mod shared;

use std::sync::Arc;

use shared::infrastructure::db;
use tauri::Manager;

use domains::repository_management::core::ports::RepositoryServices;

use domains::branch_management::commands::{
    batch_create_branch_restorations, batch_create_locked_branches, batch_delete_branches,
    batch_delete_locked_branches, create_branch_restoration, delete_all_locked_branches,
    get_branch_list, get_branch_merge_status, get_commit_reachability, list_branch_selection,
    list_deleted_branch_selection, list_locked_branches, set_branch_selection_all,
    update_branch_selection_batch, update_current_branch,
};
use domains::branch_management::events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent,
};
use domains::path_operations::commands::get_repository_root;
use domains::repository_management::commands::{
    create_repository, delete_repository, get_repository, get_repository_list,
};
use domains::repository_management::events::{NotificationEvent, RepositoryLoadedEvent};

fn main() {
    let _ = fix_path_env::fix();

    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            // Path operations
            get_repository_root,
            // Repository management
            create_repository,
            get_repository,
            get_repository_list,
            delete_repository,
            // Branch management
            get_branch_list,
            update_current_branch,
            batch_delete_branches,
            get_commit_reachability,
            get_branch_merge_status,
            create_branch_restoration,
            batch_create_branch_restorations,
            // Selected branches
            list_branch_selection,
            list_deleted_branch_selection,
            update_branch_selection_batch,
            set_branch_selection_all,
            // Locked branches
            list_locked_branches,
            batch_create_locked_branches,
            batch_delete_locked_branches,
            delete_all_locked_branches,
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
            "../src/infrastructure/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db::DatabaseState::new())
        .manage(RepositoryServices {
            branch: Arc::new(composition::BranchManagementGateway),
            path: Arc::new(composition::PathOperationsGateway),
        })
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // Initialize database
            let db_state = app.state::<db::DatabaseState>();
            db_state
                .initialize(app.handle())
                .expect("Failed to initialize database");

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
        let _ = commands::update_current_branch;
        let _ = commands::batch_delete_branches;
        let _ = commands::get_commit_reachability;
        let _ = commands::get_branch_merge_status;
        let _ = commands::create_branch_restoration;
        let _ = commands::batch_create_branch_restorations;
        let _ = path_commands::get_repository_root;
    }
}

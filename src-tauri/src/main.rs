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

use domains::repository_cleanup::core::ports::CleanupServices;
use domains::repository_management::core::ports::RepositoryServices;

use domains::branch_management::commands::{
    batch_create_branch_restorations, batch_create_locked_branches, batch_delete_branches,
    batch_delete_locked_branches, create_branch_restoration, delete_all_locked_branches,
    get_branch_diff_stats, get_branch_list, get_branch_merge_status, get_commit_reachability,
    list_branch_selection, list_deleted_branch_selection, list_locked_branches,
    set_branch_selection_all, update_branch_selection_batch, update_current_branch,
};
use domains::branch_management::events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent,
};
use domains::branch_management::features::branch_diff::{
    get_file_diff, get_file_lines, list_changed_files,
};
use domains::branch_management::features::code_structure::get_diff_structure;
use domains::branch_management::features::commit_history::{
    get_commit_history_window, list_branch_comparison, list_commit_history,
};
use domains::path_operations::commands::get_repository_root;
use domains::repository_cleanup::commands::{
    clean_repository, list_stale_repositories, scan_cleanup_targets,
};
use domains::repository_cleanup::events::{
    CleanupScanProgressEvent, CleanupTargetCleanedEvent, StaleScanProgressEvent,
};
use domains::repository_management::commands::{
    build_watch_callback, create_repository, delete_repository, discover_repositories,
    get_repository, get_repository_list, get_repository_sync_status, register_all_repositories,
    WATCH_DEBOUNCE,
};
use domains::repository_management::events::{
    NotificationEvent, RepositoryChangedEvent, RepositoryLoadedEvent, RepositoryScanProgressEvent,
};
use domains::worktree_management::commands::{
    add_worktree, list_worktrees, lock_worktree, remove_worktree, unlock_worktree,
};
use shared::infrastructure::watcher::WatcherState;

/// Default log verbosity when `CUT_BRANCHES_LOG` is unset: quieter in release
/// (warnings and errors only) and chattier in dev (adds info-level events).
fn default_log_level() -> log::LevelFilter {
    if cfg!(debug_assertions) {
        log::LevelFilter::Info
    } else {
        log::LevelFilter::Warn
    }
}

/// Parses a log level from the optional `CUT_BRANCHES_LOG` value. Accepts the
/// standard level names plus `off`, case- and whitespace-insensitive. `None` or
/// an unrecognized value falls back to [`default_log_level`]. Kept free of env
/// access so it stays unit-testable.
fn parse_log_level(value: Option<&str>) -> log::LevelFilter {
    use log::LevelFilter;
    match value.map(|v| v.trim().to_ascii_lowercase()).as_deref() {
        Some("off") => LevelFilter::Off,
        Some("error") => LevelFilter::Error,
        Some("warn") | Some("warning") => LevelFilter::Warn,
        Some("info") => LevelFilter::Info,
        Some("debug") => LevelFilter::Debug,
        Some("trace") => LevelFilter::Trace,
        _ => default_log_level(),
    }
}

/// Resolves the runtime log level from the `CUT_BRANCHES_LOG` environment
/// variable, e.g. `CUT_BRANCHES_LOG=debug pnpm run dev` to see verbose tracing.
fn resolve_log_level() -> log::LevelFilter {
    parse_log_level(std::env::var("CUT_BRANCHES_LOG").ok().as_deref())
}

fn main() {
    let _ = fix_path_env::fix();

    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            // Path operations
            get_repository_root,
            // Repository management
            create_repository,
            discover_repositories,
            get_repository,
            get_repository_list,
            delete_repository,
            get_repository_sync_status,
            // Branch management
            get_branch_list,
            update_current_branch,
            batch_delete_branches,
            get_commit_reachability,
            get_branch_merge_status,
            get_branch_diff_stats,
            create_branch_restoration,
            batch_create_branch_restorations,
            // Commit history + branch graph
            list_commit_history,
            get_commit_history_window,
            list_branch_comparison,
            // Branch/commit diff (review view)
            list_changed_files,
            get_file_diff,
            get_file_lines,
            // Diff code structure (canvas view / impact badges)
            get_diff_structure,
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
            // Repository cleanup
            scan_cleanup_targets,
            list_stale_repositories,
            clean_repository,
            // Worktree management
            list_worktrees,
            add_worktree,
            remove_worktree,
            lock_worktree,
            unlock_worktree,
        ])
        .events(tauri_specta::collect_events![
            BranchDeletedEvent,
            BranchRestoredEvent,
            BranchSwitchedEvent,
            RepositoryLoadedEvent,
            RepositoryChangedEvent,
            RepositoryScanProgressEvent,
            NotificationEvent,
            CleanupScanProgressEvent,
            StaleScanProgressEvent,
            CleanupTargetCleanedEvent
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            // Byte counts and Unix timestamps in the cleanup domain use 64-bit
            // integers; emit them as `number` (disk sizes never approach 2^53)
            // instead of the default `Fail` behavior, which would abort export.
            specta_typescript::Typescript::default()
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/infrastructure/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    let mut tauri_builder = tauri::Builder::default();

    // The single-instance plugin must be the FIRST plugin registered so it can
    // short-circuit a duplicate launch before any other setup runs. A second
    // instance would otherwise fight this one over the shared SQLite database
    // and the filesystem watcher. Desktop-only.
    #[cfg(desktop)]
    {
        tauri_builder =
            tauri_builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                // Bring the already-running window to the front instead of
                // spawning a new instance.
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }));
    }

    tauri_builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .level(resolve_log_level())
                .build(),
        )
        .manage(db::DatabaseState::new())
        .manage(WatcherState::new())
        .manage(domains::branch_management::features::commit_history::git::HistoryCache::default())
        .manage(RepositoryServices {
            branch: Arc::new(composition::BranchManagementGateway),
            path: Arc::new(composition::PathOperationsGateway),
        })
        .manage(CleanupServices {
            catalog: Arc::new(composition::RepositoryCatalogGateway),
        })
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // Initialize database
            let db_state = app.state::<db::DatabaseState>();
            db_state
                .initialize(app.handle())
                .expect("Failed to initialize database");

            // Initialize the shared filesystem watcher and start watching every
            // registered repository so branch state (incl. sidebar counts) stays
            // in sync with external git changes.
            let watcher = app.state::<WatcherState>();
            if let Err(e) = watcher.init(WATCH_DEBOUNCE, build_watch_callback(app.handle().clone()))
            {
                log::error!("[watcher] init failed: {e}");
            }
            register_all_repositories(app.handle());

            builder.mount_events(app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // Deterministically stop the filesystem watcher on exit.
            if let tauri::RunEvent::Exit = event {
                app.state::<WatcherState>().shutdown();
            }
        });
}

#[cfg(test)]
mod tests {
    use super::{default_log_level, parse_log_level};
    use log::LevelFilter;

    #[test]
    fn parse_log_level_recognizes_all_names() {
        assert_eq!(parse_log_level(Some("off")), LevelFilter::Off);
        assert_eq!(parse_log_level(Some("error")), LevelFilter::Error);
        assert_eq!(parse_log_level(Some("warn")), LevelFilter::Warn);
        assert_eq!(parse_log_level(Some("warning")), LevelFilter::Warn);
        assert_eq!(parse_log_level(Some("info")), LevelFilter::Info);
        assert_eq!(parse_log_level(Some("debug")), LevelFilter::Debug);
        assert_eq!(parse_log_level(Some("trace")), LevelFilter::Trace);
    }

    #[test]
    fn parse_log_level_is_case_and_whitespace_insensitive() {
        assert_eq!(parse_log_level(Some("  DEBUG ")), LevelFilter::Debug);
        assert_eq!(parse_log_level(Some("Info")), LevelFilter::Info);
        assert_eq!(parse_log_level(Some("WARN")), LevelFilter::Warn);
    }

    #[test]
    fn parse_log_level_falls_back_on_unknown_empty_or_none() {
        assert_eq!(parse_log_level(Some("bogus")), default_log_level());
        assert_eq!(parse_log_level(Some("")), default_log_level());
        assert_eq!(parse_log_level(None), default_log_level());
    }

    #[test]
    fn default_log_level_is_info_in_debug_builds() {
        // Tests run under debug_assertions, so the dev default applies.
        assert_eq!(default_log_level(), LevelFilter::Info);
    }

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
        use crate::domains::repository_cleanup::commands as cleanup_commands;
        use crate::domains::repository_management::commands as repo_commands;
        use crate::domains::worktree_management::commands as worktree_commands;

        // Test that we can access the command functions
        let _ = repo_commands::get_repository;
        let _ = commands::update_current_branch;
        let _ = commands::batch_delete_branches;
        let _ = commands::get_commit_reachability;
        let _ = commands::get_branch_merge_status;
        let _ = commands::get_branch_diff_stats;
        let _ = commands::create_branch_restoration;
        let _ = crate::domains::branch_management::features::branch_diff::list_changed_files;
        let _ = crate::domains::branch_management::features::branch_diff::get_file_diff;
        let _ = crate::domains::branch_management::features::branch_diff::get_file_lines;
        let _ = crate::domains::branch_management::features::code_structure::get_diff_structure;
        let _ = commands::batch_create_branch_restorations;
        let _ = path_commands::get_repository_root;
        let _ = cleanup_commands::scan_cleanup_targets;
        let _ = cleanup_commands::list_stale_repositories;
        let _ = cleanup_commands::clean_repository;
        let _ = worktree_commands::list_worktrees;
        let _ = worktree_commands::add_worktree;
        let _ = worktree_commands::remove_worktree;
        let _ = worktree_commands::lock_worktree;
        let _ = worktree_commands::unlock_worktree;
    }
}

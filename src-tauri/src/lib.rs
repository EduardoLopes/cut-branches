pub mod db;
pub mod domains;
pub mod shared;

// Re-export the main error type for backward compatibility during migration
pub use shared::error::AppError;

// Re-export commonly used types for backward compatibility
pub use domains::branch_management::git::branch::{Branch, Commit};
pub use domains::branch_management::services::deletion::{
    DeletedBranch, DeletedBranchInfo, RestoreBranchResult,
};
pub use domains::path_operations::service::RootPathResponse;
pub use domains::repository_management::services::discovery::GitDirResponse;

// Re-export command functions
pub use domains::branch_management::commands::{
    batch_create_branch_restorations, batch_create_locked_branches, batch_create_selected_branches,
    batch_delete_branches, batch_delete_locked_branches, batch_delete_selected_branches,
    create_branch_restoration, delete_all_locked_branches, delete_all_selected_branches,
    get_commit_reachability, list_branches, list_locked_branches, list_selected_branches,
    update_current_branch,
};
pub use domains::path_operations::commands::get_repository_root;
pub use domains::repository_management::commands::{
    create_repository, delete_repository, get_repository, list_repositories,
};

// Re-export events
pub use domains::branch_management::events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent,
};
pub use domains::repository_management::events::{NotificationEvent, RepositoryLoadedEvent};

#[cfg(test)]
pub use shared::utils::test_utils;

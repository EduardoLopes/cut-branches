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
    delete_branches, is_commit_reachable, restore_branch, restore_branches, switch_branch,
};
pub use domains::path_operations::commands::get_repository_root;
pub use domains::repository_management::commands::get_repository;

// Re-export events
pub use domains::branch_management::events::{
    BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent,
};
pub use domains::repository_management::events::{NotificationEvent, RepositoryLoadedEvent};

#[cfg(test)]
pub use shared::utils::test_utils;

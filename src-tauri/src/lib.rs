pub mod domains;
pub mod shared;

// Re-export the main error type for backward compatibility during migration
pub use shared::error::AppError;

// Re-export commonly used types for backward compatibility
pub use domains::branch_management::types::{Branch, Commit, DeletedBranchInfo, RestoreBranchInput, RestoreBranchResult};
pub use domains::repository_management::types::GitDirResponse;
pub use domains::path_operations::types::RootPathResponse;

// Re-export command functions
pub use domains::branch_management::commands::{delete_branches, is_commit_reachable, restore_deleted_branch, restore_deleted_branches, switch_branch};
pub use domains::repository_management::commands::get_repo_info;
pub use domains::path_operations::commands::get_root;

// Re-export events
pub use domains::branch_management::events::{BranchDeletedEvent, BranchRestoredEvent, BranchSwitchedEvent};
pub use domains::repository_management::events::{NotificationEvent, RepositoryLoadedEvent};

#[cfg(test)]
pub use shared::utils::test_utils;
// src-tauri/src/git/mod.rs

pub mod branch;
pub mod commit;
pub mod types;

pub use types::{DeletedBranchInfo, GitDirResponse, RestoreBranchInput};

pub use branch::{
    delete_branches, get_all_branches_with_last_commit, get_current_branch, restore_deleted_branch,
    restore_deleted_branches, switch_branch,
};

pub use commit::is_commit_reachable;

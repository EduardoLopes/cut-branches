mod commit;
mod delete;
mod restore;
mod switch;

// Only export the functions, not the module names
pub use commit::is_commit_reachable;
pub use delete::delete_branches;
pub use restore::{restore_deleted_branch, restore_deleted_branches};
pub use switch::switch_branch;
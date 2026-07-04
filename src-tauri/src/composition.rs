//! Composition root wiring (§1.5, §4). Adapters that fulfil
//! `repository_management`'s ports by delegating to the public use-cases of
//! `branch_management` and `path_operations`. This module is the single place
//! permitted to depend on more than one domain — it lives at the crate root,
//! outside `domains/`, so the domain-boundary check does not flag it.

use std::path::Path;

use crate::domains::repository_management::core::ports::{BranchGateway, PathGateway};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DbConnection;
use crate::shared::kernel::branch::Branch;

/// Fulfils `BranchGateway` by calling into `branch_management`.
pub struct BranchManagementGateway;

impl BranchGateway for BranchManagementGateway {
    fn list_branches_fast(&self, path: &Path) -> Result<Vec<Branch>, AppError> {
        crate::domains::branch_management::infrastructure::git::branch::get_all_branches_with_last_commit_fast(path)
    }

    fn current_branch(&self, path: &Path) -> Result<String, AppError> {
        crate::domains::branch_management::infrastructure::git::branch::get_current_branch(path)
    }

    fn sync_branches(
        &self,
        branches: &[Branch],
        repo_id: &str,
        conn: &mut DbConnection,
    ) -> Result<usize, AppError> {
        crate::domains::branch_management::core::application::sync::sync_branches_to_db(
            Some(branches),
            None,
            repo_id,
            conn,
        )
    }
}

/// Fulfils `PathGateway` by calling into `path_operations`.
pub struct PathOperationsGateway;

impl PathGateway for PathOperationsGateway {
    fn resolve_root_path(&self, path: &Path) -> Result<String, AppError> {
        Ok(crate::domains::path_operations::infrastructure::git::resolve_workdir(path)?)
    }
}

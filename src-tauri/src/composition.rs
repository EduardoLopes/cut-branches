//! Composition root wiring (§1.5, §4). Adapters that fulfil
//! `repository_management`'s ports by delegating to the public use-cases of
//! `branch_management` and `path_operations`. This module is the single place
//! permitted to depend on more than one domain — it lives at the crate root,
//! outside `domains/`, so the domain-boundary check does not flag it.

use std::path::Path;

use crate::domains::repository_cleanup::core::models::registered_repo::RegisteredRepo;
use crate::domains::repository_cleanup::core::ports::RepositoryCatalog;
use crate::domains::repository_management::core::ports::{BranchGateway, PathGateway};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DbConnection;
use crate::shared::kernel::branch::Branch;

/// Fulfils `BranchGateway` by calling into `branch_management`.
pub struct BranchManagementGateway;

impl BranchGateway for BranchManagementGateway {
    fn list_branches(&self, path: &Path) -> Result<Vec<Branch>, AppError> {
        crate::domains::branch_management::infrastructure::git::branch::get_all_branches_with_last_commit(path)
    }

    fn current_branch(&self, path: &Path) -> Result<String, AppError> {
        crate::domains::branch_management::infrastructure::git::branch::find_current_branch(path)
            .map(Option::unwrap_or_default)
    }

    fn list_db_branches(
        &self,
        repo_id: &str,
        conn: &mut DbConnection,
    ) -> Result<Vec<Branch>, AppError> {
        let records =
            crate::domains::branch_management::infrastructure::repositories::get_branches_for_repository(
                conn,
                repo_id,
                &crate::domains::branch_management::filters::BranchFilters::default(),
            )
            .map_err(|e| {
                AppError::new(
                    "Failed to get branches from database".to_string(),
                    "db_query_failed",
                    Some(e.to_string()),
                )
            })?;

        Ok(records.into_iter().map(Branch::from).collect())
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

/// Fulfils `repository_cleanup`'s `RepositoryCatalog` port by reading the
/// registered repositories owned by `repository_management` and projecting them
/// into that domain's minimal `RegisteredRepo` shape (an ACL, §1.4).
pub struct RepositoryCatalogGateway;

impl RepositoryCatalog for RepositoryCatalogGateway {
    fn list_registered(&self, conn: &mut DbConnection) -> Result<Vec<RegisteredRepo>, AppError> {
        let repos =
            crate::domains::repository_management::infrastructure::repositories::get_repository_list(
                conn,
            )?;
        Ok(repos
            .into_iter()
            .map(|r| RegisteredRepo {
                id: r.id,
                name: r.name,
                path: r.path,
            })
            .collect())
    }
}

//! Ports (§1.2, §1.5): interfaces this domain defines for capabilities that
//! belong to *other* domains. repository_management must not import
//! branch_management or path_operations (§1.3), so it depends on these traits
//! and the composition root injects adapters that call those domains' public
//! use-cases. The adapters live at the crate root (`composition.rs`), the only
//! place allowed to depend on more than one domain.

use std::path::Path;
use std::sync::Arc;

use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DbConnection;
use crate::shared::kernel::branch::Branch;

/// Branch data + branch→DB sync, owned by branch_management.
pub trait BranchGateway: Send + Sync {
    /// List branches with last-commit info, skipping the expensive merge check.
    fn list_branches_fast(&self, path: &Path) -> Result<Vec<Branch>, AppError>;

    /// Name of the currently checked-out branch, or an empty string when
    /// HEAD is detached (a repository with no current branch is still valid).
    fn current_branch(&self, path: &Path) -> Result<String, AppError>;

    /// Active branches for `repo_id` as persisted in the database — used to
    /// serve reads without touching git when the repo state is unchanged.
    fn list_db_branches(
        &self,
        repo_id: &str,
        conn: &mut DbConnection,
    ) -> Result<Vec<Branch>, AppError>;

    /// Reconcile the given git branches into the database for `repo_id`.
    fn sync_branches(
        &self,
        branches: &[Branch],
        repo_id: &str,
        conn: &mut DbConnection,
    ) -> Result<usize, AppError>;
}

/// Working-directory-root resolution, owned by path_operations.
pub trait PathGateway: Send + Sync {
    fn resolve_root_path(&self, path: &Path) -> Result<String, AppError>;
}

/// Cross-domain dependencies wired at the composition root (§4) and handed to
/// delivery handlers through Tauri managed state.
pub struct RepositoryServices {
    pub branch: Arc<dyn BranchGateway>,
    pub path: Arc<dyn PathGateway>,
}

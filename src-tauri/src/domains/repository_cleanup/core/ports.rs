//! Ports (§1.2, §1.5): capabilities this domain needs but does not own.
//! `repository_cleanup` must not import `repository_management` (§1.3), so it
//! depends on this trait and the composition root injects an adapter that calls
//! that domain's public operations. The adapter lives at the crate root
//! (`composition.rs`), the only place allowed to depend on more than one domain.

use std::sync::Arc;

use crate::domains::repository_cleanup::core::models::registered_repo::RegisteredRepo;
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DbConnection;

/// Read access to the repositories the app already knows about, owned by
/// `repository_management`.
pub trait RepositoryCatalog: Send + Sync {
    /// List every registered repository (id, name, working-dir path).
    fn list_registered(&self, conn: &mut DbConnection) -> Result<Vec<RegisteredRepo>, AppError>;
}

/// Cross-domain dependencies for cleanup, wired at the composition root (§4) and
/// handed to delivery handlers through Tauri managed state.
pub struct CleanupServices {
    pub catalog: Arc<dyn RepositoryCatalog>,
}

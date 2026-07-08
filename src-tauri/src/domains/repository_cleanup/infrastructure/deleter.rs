//! Performs the actual deletion of a validated target (§1.1 infrastructure).

use crate::domains::repository_cleanup::core::models::clean_target::CleanTarget;
use crate::domains::repository_cleanup::core::models::deletion_mode::DeletionMode;
use crate::domains::repository_cleanup::error::CleanupError;

/// Delete a validated target, either to the OS trash (recoverable) or
/// permanently. Only ever called with a `CleanTarget`, which is proof the path
/// cleared every safeguard.
pub fn delete_target(target: &CleanTarget, mode: DeletionMode) -> Result<(), CleanupError> {
    let path = target.path();
    let result = match mode {
        DeletionMode::Trash => trash::delete(path).map_err(|e| e.to_string()),
        DeletionMode::Permanent => std::fs::remove_dir_all(path).map_err(|e| e.to_string()),
    };
    result.map_err(|detail| CleanupError::DeletionFailed {
        path: path.to_path_buf(),
        detail,
    })
}

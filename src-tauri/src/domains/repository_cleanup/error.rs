//! Repository-cleanup domain error vocabulary (§1.1, §3.2). These are the
//! expected, domain-meaningful ways a deletion can be refused or fail. The
//! safety refusals (`PathOutsideRepository`, `RefusedSymlink`, …) are the heart
//! of this feature: a destructive command must fail closed. Unexpected
//! infrastructure failures stay as opaque `AppError`s (§3.3).

use std::path::PathBuf;

use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum CleanupError {
    #[error("Target '{path}' is not inside the repository")]
    PathOutsideRepository { path: PathBuf },

    #[error("Target '{path}' does not exist")]
    TargetNotFound { path: PathBuf },

    #[error("Target '{path}' is not a directory")]
    NotADirectory { path: PathBuf },

    #[error("Refused to delete '{path}': it is a symbolic link")]
    RefusedSymlink { path: PathBuf },

    #[error("Refused to delete the repository root or its .git directory")]
    RefusedRepoRoot { path: PathBuf },

    #[error("Folder '{name}' is not ignored by the repository's .gitignore")]
    NotIgnored { name: String },

    #[error("Failed to delete '{path}'")]
    DeletionFailed { path: PathBuf, detail: String },
}

impl From<CleanupError> for AppError {
    fn from(err: CleanupError) -> Self {
        let kind = match &err {
            CleanupError::PathOutsideRepository { .. } => "cleanup_path_outside_repository",
            CleanupError::TargetNotFound { .. } => "cleanup_target_not_found",
            CleanupError::NotADirectory { .. } => "cleanup_not_a_directory",
            CleanupError::RefusedSymlink { .. } => "cleanup_refused_symlink",
            CleanupError::RefusedRepoRoot { .. } => "cleanup_refused_repo_root",
            CleanupError::NotIgnored { .. } => "cleanup_not_ignored",
            CleanupError::DeletionFailed { .. } => "cleanup_deletion_failed",
        };

        let description = match &err {
            CleanupError::DeletionFailed { detail, .. } => Some(detail.clone()),
            CleanupError::NotIgnored { .. } => Some(
                "For safety, only directories your repository's .gitignore ignores can be deleted."
                    .to_string(),
            ),
            _ => None,
        };

        AppError::new(err.to_string(), kind, description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_kinds_and_preserves_message() {
        let app: AppError = CleanupError::RefusedSymlink {
            path: PathBuf::from("/repo/node_modules"),
        }
        .into();
        assert_eq!(app.kind, "cleanup_refused_symlink");
        assert!(app.message.contains("symbolic link"));
    }

    #[test]
    fn deletion_failed_carries_detail() {
        let app: AppError = CleanupError::DeletionFailed {
            path: PathBuf::from("/repo/dist"),
            detail: "permission denied".into(),
        }
        .into();
        assert_eq!(app.kind, "cleanup_deletion_failed");
        assert_eq!(app.description.as_deref(), Some("permission denied"));
    }

    #[test]
    fn not_ignored_has_guidance() {
        let app: AppError = CleanupError::NotIgnored { name: "src".into() }.into();
        assert_eq!(app.kind, "cleanup_not_ignored");
        assert!(app.description.is_some());
    }
}

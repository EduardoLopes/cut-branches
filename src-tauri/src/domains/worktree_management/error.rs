//! Worktree-management domain error vocabulary (§1.1, §3.2). These are the
//! expected, domain-meaningful ways a worktree operation can be refused or
//! fail. Raw git2 failures are wrapped here and mapped to a stable `AppError`
//! `kind` at the boundary (§3.3); unexpected failures keep their detail.

use std::path::PathBuf;

use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum WorktreeError {
    #[error("Failed to open repository at '{path}'")]
    RepositoryOpenFailed { path: String, detail: String },

    #[error("Worktree '{name}' was not found")]
    WorktreeNotFound { name: String },

    #[error("A worktree named '{name}' already exists")]
    WorktreeAlreadyExists { name: String },

    #[error("Failed to list worktrees")]
    ListFailed { detail: String },

    #[error("Failed to create worktree '{name}'")]
    AddFailed { name: String, detail: String },

    #[error("Failed to remove worktree '{name}'")]
    RemoveFailed { name: String, detail: String },

    #[error("Refused to remove the main worktree")]
    RefusedMainWorktree,

    #[error("Path '{path}' already exists")]
    PathAlreadyExists { path: PathBuf },

    #[error("'{name}' is not a valid worktree name")]
    InvalidWorktreeName { name: String },

    #[error("Branch '{name}' was not found")]
    BranchNotFound { name: String },

    #[error("Failed to lock worktree '{name}'")]
    LockFailed { name: String, detail: String },

    #[error("Failed to unlock worktree '{name}'")]
    UnlockFailed { name: String, detail: String },

    #[error("Worktree '{name}' is already locked")]
    AlreadyLocked { name: String },

    #[error("Worktree '{name}' is not locked")]
    NotLocked { name: String },
}

impl From<WorktreeError> for AppError {
    fn from(err: WorktreeError) -> Self {
        let kind = match &err {
            WorktreeError::RepositoryOpenFailed { .. } => "worktree_repository_open_failed",
            WorktreeError::WorktreeNotFound { .. } => "worktree_not_found",
            WorktreeError::WorktreeAlreadyExists { .. } => "worktree_already_exists",
            WorktreeError::ListFailed { .. } => "worktree_list_failed",
            WorktreeError::AddFailed { .. } => "worktree_add_failed",
            WorktreeError::RemoveFailed { .. } => "worktree_remove_failed",
            WorktreeError::RefusedMainWorktree => "worktree_refused_main",
            WorktreeError::PathAlreadyExists { .. } => "worktree_path_already_exists",
            WorktreeError::InvalidWorktreeName { .. } => "worktree_invalid_name",
            WorktreeError::BranchNotFound { .. } => "worktree_branch_not_found",
            WorktreeError::LockFailed { .. } => "worktree_lock_failed",
            WorktreeError::UnlockFailed { .. } => "worktree_unlock_failed",
            WorktreeError::AlreadyLocked { .. } => "worktree_already_locked",
            WorktreeError::NotLocked { .. } => "worktree_not_locked",
        };

        let description = match &err {
            WorktreeError::RepositoryOpenFailed { detail, .. }
            | WorktreeError::ListFailed { detail, .. }
            | WorktreeError::AddFailed { detail, .. }
            | WorktreeError::RemoveFailed { detail, .. }
            | WorktreeError::LockFailed { detail, .. }
            | WorktreeError::UnlockFailed { detail, .. } => Some(detail.clone()),
            WorktreeError::RefusedMainWorktree => Some(
                "The main worktree is the repository itself and cannot be removed.".to_string(),
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
    fn maps_kind_and_preserves_message() {
        let app: AppError = WorktreeError::WorktreeNotFound {
            name: "feature".into(),
        }
        .into();
        assert_eq!(app.kind, "worktree_not_found");
        assert!(app.message.contains("feature"));
        assert!(app.description.is_none());
    }

    #[test]
    fn add_failed_carries_detail() {
        let app: AppError = WorktreeError::AddFailed {
            name: "feature".into(),
            detail: "boom".into(),
        }
        .into();
        assert_eq!(app.kind, "worktree_add_failed");
        assert_eq!(app.description.as_deref(), Some("boom"));
    }

    #[test]
    fn refused_main_has_guidance() {
        let app: AppError = WorktreeError::RefusedMainWorktree.into();
        assert_eq!(app.kind, "worktree_refused_main");
        assert!(app.description.is_some());
    }

    #[test]
    fn every_variant_maps_to_a_distinct_kind() {
        let variants: Vec<WorktreeError> = vec![
            WorktreeError::RepositoryOpenFailed {
                path: "/p".into(),
                detail: "d".into(),
            },
            WorktreeError::WorktreeNotFound { name: "n".into() },
            WorktreeError::WorktreeAlreadyExists { name: "n".into() },
            WorktreeError::ListFailed { detail: "d".into() },
            WorktreeError::AddFailed {
                name: "n".into(),
                detail: "d".into(),
            },
            WorktreeError::RemoveFailed {
                name: "n".into(),
                detail: "d".into(),
            },
            WorktreeError::RefusedMainWorktree,
            WorktreeError::PathAlreadyExists {
                path: PathBuf::from("/p"),
            },
            WorktreeError::InvalidWorktreeName { name: "n".into() },
            WorktreeError::BranchNotFound { name: "n".into() },
            WorktreeError::LockFailed {
                name: "n".into(),
                detail: "d".into(),
            },
            WorktreeError::UnlockFailed {
                name: "n".into(),
                detail: "d".into(),
            },
            WorktreeError::AlreadyLocked { name: "n".into() },
            WorktreeError::NotLocked { name: "n".into() },
        ];

        let mut kinds: Vec<String> = variants
            .into_iter()
            .map(|v| AppError::from(v).kind)
            .collect();
        let total = kinds.len();
        kinds.sort();
        kinds.dedup();
        assert_eq!(kinds.len(), total, "each variant must map to a unique kind");
    }
}

// TODO(step-4-migration): Foundation only. Replace direct `AppError::new(...)`
// call sites in `git/branch.rs`, `git/commit.rs`, and `services/*.rs` with
// `BranchError` variants. Existing `AppError` returns continue to work because
// of `From<BranchError> for AppError` below; migration can happen file-by-file.

use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum BranchError {
    #[error("Branch '{name}' not found")]
    NotFound { name: String },

    #[error("Failed to list branches: {source}")]
    ListFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to retrieve information for branch '{name}': {source}")]
    InfoFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read commit for branch '{name}': {source}")]
    CommitFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read branch name: {source}")]
    NameFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to sync branches: {source}")]
    SyncFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to checkout branch '{name}': {source}")]
    CheckoutFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to create branch '{name}': {source}")]
    CreateFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to delete branch '{name}': {source}")]
    DeleteFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to set HEAD to '{target}': {source}")]
    SetHeadFailed {
        target: String,
        #[source]
        source: git2::Error,
    },

    #[error("HEAD reference not found: {source}")]
    HeadNotFound {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read HEAD commit: {source}")]
    HeadCommitFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Commit not found: {sha}")]
    CommitNotFound { sha: String },

    #[error("Failed to peel commit: {source}")]
    CommitPeelFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Invalid branch name '{name}': {reason}")]
    InvalidName { name: String, reason: String },

    #[error("Branch name is not valid UTF-8")]
    InvalidUtf8,

    #[error("Unable to access directory '{path}': {source}")]
    UnableToAccessDir {
        path: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to open repository at '{path}': {source}")]
    RepositoryOpenFailed {
        path: String,
        #[source]
        source: git2::Error,
    },
}

impl From<BranchError> for AppError {
    fn from(err: BranchError) -> Self {
        let kind = match &err {
            BranchError::NotFound { .. } => "branch_not_found",
            BranchError::ListFailed { .. } => "branch_list_failed",
            BranchError::InfoFailed { .. } => "branch_info_failed",
            BranchError::CommitFailed { .. } => "branch_commit_failed",
            BranchError::NameFailed { .. } => "branch_name_failed",
            BranchError::SyncFailed { .. } => "branch_sync_failed",
            BranchError::CheckoutFailed { .. } => "checkout_failed",
            BranchError::CreateFailed { .. } => "create_branch_failed",
            BranchError::DeleteFailed { .. } => "delete_branch_failed",
            BranchError::SetHeadFailed { .. } => "set_head_failed",
            BranchError::HeadNotFound { .. } => "head_not_found",
            BranchError::HeadCommitFailed { .. } => "head_commit_failed",
            BranchError::CommitNotFound { .. } => "commit_not_found",
            BranchError::CommitPeelFailed { .. } => "commit_peel_failed",
            BranchError::InvalidName { .. } => "invalid_branch_name",
            BranchError::InvalidUtf8 => "invalid_utf8",
            BranchError::UnableToAccessDir { .. } => "unable_to_access_dir",
            BranchError::RepositoryOpenFailed { .. } => "repository_open_failed",
        };

        let description = match &err {
            BranchError::ListFailed { source }
            | BranchError::InfoFailed { source, .. }
            | BranchError::CommitFailed { source, .. }
            | BranchError::NameFailed { source }
            | BranchError::SyncFailed { source }
            | BranchError::CheckoutFailed { source, .. }
            | BranchError::CreateFailed { source, .. }
            | BranchError::DeleteFailed { source, .. }
            | BranchError::SetHeadFailed { source, .. }
            | BranchError::HeadNotFound { source }
            | BranchError::HeadCommitFailed { source }
            | BranchError::CommitPeelFailed { source }
            | BranchError::UnableToAccessDir { source, .. }
            | BranchError::RepositoryOpenFailed { source, .. } => Some(source.to_string()),
            BranchError::NotFound { .. }
            | BranchError::CommitNotFound { .. }
            | BranchError::InvalidName { .. }
            | BranchError::InvalidUtf8 => None,
        };

        AppError::new(err.to_string(), kind, description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_not_found_to_legacy_kind() {
        let app: AppError = BranchError::NotFound {
            name: "feature/x".into(),
        }
        .into();
        assert_eq!(app.kind, "branch_not_found");
        assert!(app.message.contains("feature/x"));
    }

    #[test]
    fn maps_invalid_name_to_legacy_kind() {
        let app: AppError = BranchError::InvalidName {
            name: "bad name".into(),
            reason: "contains whitespace".into(),
        }
        .into();
        assert_eq!(app.kind, "invalid_branch_name");
    }
}

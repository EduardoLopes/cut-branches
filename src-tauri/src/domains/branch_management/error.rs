//! Branch-management domain error vocabulary (§1.1, §3.2).
//!
//! Every fallible git operation in this domain's infrastructure returns a
//! `BranchError`; the delivery layer converts it to the app-wide `AppError`
//! via the `From` impl below. The `#[error]` messages and the `kind`/
//! `description` mapping reproduce the exact strings the frontend already
//! receives — adopting the enum is a pure refactor, not a contract change.

use thiserror::Error;

use crate::domains::branch_management::core::models::branch_name::BranchNameError;
use crate::domains::branch_management::core::models::commit_sha::CommitShaError;
use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum BranchError {
    #[error("Unable to access the path: {path}")]
    UnableToAccessDir { path: String, detail: String },

    #[error("Failed to execute git command: {path}")]
    CommandExecutionFailed { path: String, detail: String },

    #[error("Failed to open git repository at {path}: {source}")]
    RepositoryOpenFailed {
        path: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to list branches: {source}")]
    ListFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to get branch info: {source}")]
    InfoFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to get branch name: {source}")]
    NameFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Branch name contains invalid UTF-8")]
    InvalidUtf8,

    #[error("Failed to get commit for branch {name}: {source}")]
    CommitPeelFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Couldn\\'t retrieve branches with last commit info in the path **{path}**")]
    NoBranches { path: String },

    #[error("Failed to get HEAD: {source}")]
    HeadNotFound {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to find branch '{name}': {source}")]
    FindBranchFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to get HEAD commit: {source}")]
    HeadCommitFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Failed to get branch commit: {source}")]
    BranchCommitFailed {
        #[source]
        source: git2::Error,
    },

    #[error("HEAD is not pointing to a branch in path {path}")]
    DetachedHead { path: String },

    #[error("Failed to get branch name in path {path}")]
    InvalidBranchName { path: String },

    #[error("Branch **{name}** not found")]
    BranchNotFound { name: String, path: String },

    #[error("Failed to set HEAD to branch '{name}': {source}")]
    SetHeadFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to checkout branch '{name}': {source}")]
    CheckoutFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("{message}")]
    BranchesNotFound { message: String, detail: String },

    #[error("{message}")]
    BranchesInUse { message: String, detail: String },

    #[error("Failed to delete branch '{name}': {source}")]
    DeleteBranchFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Commit **{sha}** not found in the repository")]
    CommitNotFoundInRepo { sha: String, path: String },

    #[error("Failed to find commit '{sha}': {source}")]
    FindCommitFailed {
        sha: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to create branch '{name}': {source}")]
    CreateBranchFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to compute diff stats for branch '{name}': {source}")]
    DiffStatsFailed {
        name: String,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to compute diff for '{target}': {source}")]
    DiffFailed {
        target: String,
        #[source]
        source: git2::Error,
    },

    #[error("File **{path}** is not part of this diff")]
    DiffFileNotFound { path: String },

    #[error("Failed to walk commit history: {source}")]
    RevwalkFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Commit history is out of date — repository refs changed")]
    HistoryCursorStale { path: String },

    #[error("Invalid commit history cursor")]
    InvalidHistoryCursor,
}

impl From<BranchError> for AppError {
    fn from(err: BranchError) -> Self {
        let kind = match &err {
            BranchError::UnableToAccessDir { .. } => "unable_to_access_dir",
            BranchError::CommandExecutionFailed { .. } => "command_execution_failed",
            BranchError::RepositoryOpenFailed { .. } => "repository_open_failed",
            BranchError::ListFailed { .. } => "branch_list_failed",
            BranchError::InfoFailed { .. } => "branch_info_failed",
            BranchError::NameFailed { .. } => "branch_name_failed",
            BranchError::InvalidUtf8 => "invalid_utf8",
            BranchError::CommitPeelFailed { .. } => "commit_peel_failed",
            BranchError::NoBranches { .. } => "no_branches",
            BranchError::HeadNotFound { .. } => "head_not_found",
            BranchError::FindBranchFailed { .. } => "branch_not_found",
            BranchError::HeadCommitFailed { .. } => "head_commit_failed",
            BranchError::BranchCommitFailed { .. } => "branch_commit_failed",
            BranchError::DetachedHead { .. } => "detached_head",
            BranchError::InvalidBranchName { .. } => "invalid_branch_name",
            BranchError::BranchNotFound { .. } => "branch_not_found",
            BranchError::SetHeadFailed { .. } => "set_head_failed",
            BranchError::CheckoutFailed { .. } => "checkout_failed",
            BranchError::BranchesNotFound { .. } => "branches_not_found",
            BranchError::BranchesInUse { .. } => "branches_in_use",
            BranchError::DeleteBranchFailed { .. } => "delete_branch_failed",
            BranchError::CommitNotFoundInRepo { .. } => "commit_not_found",
            BranchError::FindCommitFailed { .. } => "commit_not_found",
            BranchError::CreateBranchFailed { .. } => "create_branch_failed",
            BranchError::DiffStatsFailed { .. } => "diff_stats_failed",
            BranchError::DiffFailed { .. } => "diff_failed",
            BranchError::DiffFileNotFound { .. } => "diff_file_not_found",
            BranchError::RevwalkFailed { .. } => "revwalk_failed",
            BranchError::HistoryCursorStale { .. } => "history_cursor_stale",
            BranchError::InvalidHistoryCursor => "invalid_history_cursor",
        };

        let description = match &err {
            // git2-sourced variants: the source string is the description.
            BranchError::RepositoryOpenFailed { source, .. }
            | BranchError::ListFailed { source }
            | BranchError::InfoFailed { source }
            | BranchError::NameFailed { source }
            | BranchError::CommitPeelFailed { source, .. }
            | BranchError::HeadNotFound { source }
            | BranchError::FindBranchFailed { source, .. }
            | BranchError::HeadCommitFailed { source }
            | BranchError::BranchCommitFailed { source }
            | BranchError::SetHeadFailed { source, .. }
            | BranchError::CheckoutFailed { source, .. }
            | BranchError::DeleteBranchFailed { source, .. }
            | BranchError::FindCommitFailed { source, .. }
            | BranchError::CreateBranchFailed { source, .. }
            | BranchError::DiffStatsFailed { source, .. }
            | BranchError::DiffFailed { source, .. }
            | BranchError::RevwalkFailed { source } => Some(source.to_string()),

            BranchError::UnableToAccessDir { detail, .. }
            | BranchError::CommandExecutionFailed { detail, .. }
            | BranchError::BranchesNotFound { detail, .. }
            | BranchError::BranchesInUse { detail, .. } => Some(detail.clone()),

            BranchError::DetachedHead { .. } => {
                Some("Repository is in detached HEAD state".to_string())
            }
            BranchError::InvalidBranchName { .. } => {
                Some("Branch name contains invalid UTF-8".to_string())
            }
            BranchError::BranchNotFound { name, path } => Some(format!(
                "The branch '{}' does not exist in the repository at {}",
                name, path
            )),
            BranchError::CommitNotFoundInRepo { sha, path } => Some(format!(
                "The commit '{}' does not exist in the repository at {}",
                sha, path
            )),

            BranchError::HistoryCursorStale { path } => Some(format!(
                "Refs changed in the repository at {} since this page was issued; restart from the first page",
                path
            )),
            BranchError::InvalidHistoryCursor => {
                Some("The pagination cursor is malformed; restart from the first page".to_string())
            }

            BranchError::DiffFileNotFound { path } => Some(format!(
                "The file '{}' has no changes in the requested diff",
                path
            )),

            BranchError::InvalidUtf8 | BranchError::NoBranches { .. } => None,
        };

        AppError::new(err.to_string(), kind, description)
    }
}

/// Value-object validation errors (§1.2) surface as domain errors at the
/// delivery boundary. The message carries the specific reason.
impl From<BranchNameError> for AppError {
    fn from(err: BranchNameError) -> Self {
        AppError::new(err.to_string(), "invalid_branch_name", None)
    }
}

impl From<CommitShaError> for AppError {
    fn from(err: CommitShaError) -> Self {
        AppError::new(err.to_string(), "invalid_commit_sha", None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_branch_failed_preserves_kind_and_message() {
        let src = git2::Error::from_str("boom");
        let app: AppError = BranchError::FindBranchFailed {
            name: "feature/x".into(),
            source: src,
        }
        .into();
        assert_eq!(app.kind, "branch_not_found");
        assert_eq!(app.message, "Failed to find branch 'feature/x': boom");
        assert_eq!(app.description.as_deref(), Some("boom"));
    }

    #[test]
    fn branch_not_found_builds_description() {
        let app: AppError = BranchError::BranchNotFound {
            name: "main".into(),
            path: "/repo".into(),
        }
        .into();
        assert_eq!(app.kind, "branch_not_found");
        assert_eq!(app.message, "Branch **main** not found");
        assert_eq!(
            app.description.as_deref(),
            Some("The branch 'main' does not exist in the repository at /repo")
        );
    }

    #[test]
    fn detached_head_has_static_description() {
        let app: AppError = BranchError::DetachedHead {
            path: "/repo".into(),
        }
        .into();
        assert_eq!(app.kind, "detached_head");
        assert_eq!(
            app.message,
            "HEAD is not pointing to a branch in path /repo"
        );
        assert_eq!(
            app.description.as_deref(),
            Some("Repository is in detached HEAD state")
        );
    }

    #[test]
    fn diff_stats_failed_maps_kind_and_source_description() {
        let app: AppError = BranchError::DiffStatsFailed {
            name: "feature/x".into(),
            source: git2::Error::from_str("no merge base"),
        }
        .into();
        assert_eq!(app.kind, "diff_stats_failed");
        assert_eq!(
            app.message,
            "Failed to compute diff stats for branch 'feature/x': no merge base"
        );
        assert_eq!(app.description.as_deref(), Some("no merge base"));
    }

    #[test]
    fn revwalk_failed_maps_kind_and_source_description() {
        let app: AppError = BranchError::RevwalkFailed {
            source: git2::Error::from_str("walk broke"),
        }
        .into();
        assert_eq!(app.kind, "revwalk_failed");
        assert_eq!(app.message, "Failed to walk commit history: walk broke");
        assert_eq!(app.description.as_deref(), Some("walk broke"));
    }

    #[test]
    fn history_cursor_stale_builds_description() {
        let app: AppError = BranchError::HistoryCursorStale {
            path: "/repo".into(),
        }
        .into();
        assert_eq!(app.kind, "history_cursor_stale");
        assert_eq!(
            app.message,
            "Commit history is out of date — repository refs changed"
        );
        assert_eq!(
            app.description.as_deref(),
            Some("Refs changed in the repository at /repo since this page was issued; restart from the first page")
        );
    }

    #[test]
    fn invalid_history_cursor_has_static_description() {
        let app: AppError = BranchError::InvalidHistoryCursor.into();
        assert_eq!(app.kind, "invalid_history_cursor");
        assert_eq!(app.message, "Invalid commit history cursor");
        assert_eq!(
            app.description.as_deref(),
            Some("The pagination cursor is malformed; restart from the first page")
        );
    }

    #[test]
    fn no_branches_has_no_description() {
        let app: AppError = BranchError::NoBranches {
            path: "/repo".into(),
        }
        .into();
        assert_eq!(app.kind, "no_branches");
        assert_eq!(
            app.message,
            "Couldn\\'t retrieve branches with last commit info in the path **/repo**"
        );
        assert_eq!(app.description, None);
    }
}

//! Branch-management domain error vocabulary (§1.1, §3.2).
//!
//! Every fallible git operation in this domain's infrastructure returns a
//! `BranchError`; the delivery layer converts it to the app-wide `AppError`
//! via the `From` impl below. The `#[error]` messages and the `kind`/
//! `description` mapping reproduce the exact strings the frontend already
//! receives — adopting the enum is a pure refactor, not a contract change.

use thiserror::Error;

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
            BranchError::DeleteBranchFailed { .. } => "delete_branch_failed",
            BranchError::CommitNotFoundInRepo { .. } => "commit_not_found",
            BranchError::FindCommitFailed { .. } => "commit_not_found",
            BranchError::CreateBranchFailed { .. } => "create_branch_failed",
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
            | BranchError::CreateBranchFailed { source, .. } => Some(source.to_string()),

            BranchError::UnableToAccessDir { detail, .. }
            | BranchError::CommandExecutionFailed { detail, .. }
            | BranchError::BranchesNotFound { detail, .. } => Some(detail.clone()),

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

            BranchError::InvalidUtf8 | BranchError::NoBranches { .. } => None,
        };

        AppError::new(err.to_string(), kind, description)
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

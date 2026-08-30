//! Repository-management domain error vocabulary (§1.1, §3.2).
//!
//! Covers the domain-meaningful failures of this feature. Unexpected
//! infrastructure failures (DB connection/query errors) are deliberately NOT
//! modelled here — per §3.3 they stay as opaque `AppError`s rather than growing
//! per-infrastructure-failure domain variants. The `#[error]` messages and the
//! `kind`/`description` mapping reproduce the exact strings the frontend
//! already receives (a pure refactor, not a contract change).

use thiserror::Error;

use crate::domains::repository_management::core::models::repository_path::RepositoryPathError;
use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("Repository '{id}' not found")]
    NotFound { id: String },

    #[error("Repository '{name}' already exists")]
    AlreadyExists { name: String },

    #[error("Failed to get repository name")]
    NameExtractionFailed,

    #[error("Failed to convert repository name to string")]
    NameNotUtf8,

    #[error("Failed to read the git state of the repository at {path}")]
    StateUnreadable { path: String },
}

impl From<RepositoryError> for AppError {
    fn from(err: RepositoryError) -> Self {
        let kind = match &err {
            RepositoryError::NotFound { .. } => "repository_not_found",
            RepositoryError::AlreadyExists { .. } => "repository_already_exists",
            RepositoryError::NameExtractionFailed => "repo_name_failed",
            RepositoryError::NameNotUtf8 => "repo_name_failed",
            RepositoryError::StateUnreadable { .. } => "repo_state_unreadable",
        };

        let description = match &err {
            RepositoryError::NotFound { id } => Some(format!(
                "Please add the repository with ID '{}' first before accessing it",
                id
            )),
            RepositoryError::AlreadyExists { name } => Some(format!(
                "A repository with the name '{}' is already in the database",
                name
            )),
            RepositoryError::NameExtractionFailed => {
                Some("Could not extract the repository name from the file path".to_string())
            }
            RepositoryError::NameNotUtf8 => {
                Some("Repository name contains invalid UTF-8 characters".to_string())
            }
            RepositoryError::StateUnreadable { path } => Some(format!(
                "No refs, packed-refs or HEAD could be read under the git directory of '{}'",
                path
            )),
        };

        AppError::new(err.to_string(), kind, description)
    }
}

/// `RepositoryPath` validation errors (§1.2) surface as a domain error at the
/// delivery boundary.
impl From<RepositoryPathError> for AppError {
    fn from(err: RepositoryPathError) -> Self {
        AppError::new(err.to_string(), "invalid_repository_path", None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_found_preserves_message_and_description() {
        let app: AppError = RepositoryError::NotFound {
            id: "abc-123".into(),
        }
        .into();
        assert_eq!(app.kind, "repository_not_found");
        assert_eq!(app.message, "Repository 'abc-123' not found");
        assert_eq!(
            app.description.as_deref(),
            Some("Please add the repository with ID 'abc-123' first before accessing it")
        );
    }

    #[test]
    fn already_exists_preserves_message_and_description() {
        let app: AppError = RepositoryError::AlreadyExists {
            name: "my-repo".into(),
        }
        .into();
        assert_eq!(app.kind, "repository_already_exists");
        assert_eq!(app.message, "Repository 'my-repo' already exists");
        assert_eq!(
            app.description.as_deref(),
            Some("A repository with the name 'my-repo' is already in the database")
        );
    }

    #[test]
    fn name_variants_share_kind_with_distinct_messages() {
        let a: AppError = RepositoryError::NameExtractionFailed.into();
        let b: AppError = RepositoryError::NameNotUtf8.into();
        assert_eq!(a.kind, "repo_name_failed");
        assert_eq!(b.kind, "repo_name_failed");
        assert_eq!(a.message, "Failed to get repository name");
        assert_eq!(b.message, "Failed to convert repository name to string");
    }

    #[test]
    fn state_unreadable_carries_path() {
        let app: AppError = RepositoryError::StateUnreadable {
            path: "/tmp/broken".into(),
        }
        .into();
        assert_eq!(app.kind, "repo_state_unreadable");
        assert_eq!(
            app.message,
            "Failed to read the git state of the repository at /tmp/broken"
        );
        assert_eq!(
            app.description.as_deref(),
            Some("No refs, packed-refs or HEAD could be read under the git directory of '/tmp/broken'")
        );
    }
}

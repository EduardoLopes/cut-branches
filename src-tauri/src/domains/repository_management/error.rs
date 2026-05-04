// TODO(step-4-migration): Foundation only. Replace direct `AppError::new(...)`
// call sites in `commands/*.rs` and `services/*.rs` with `RepositoryError`
// variants. Existing `AppError` returns continue to work via
// `From<RepositoryError> for AppError`; migrate file-by-file.

use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("Repository not found: {id}")]
    NotFound { id: String },

    #[error("Repository '{name}' already exists")]
    AlreadyExists { name: String },

    #[error("Failed to read repository name: {source}")]
    NameFailed {
        #[source]
        source: git2::Error,
    },

    #[error("Repository path is missing")]
    MissingPath,

    #[error("Failed to compute time: {reason}")]
    TimeError { reason: String },
}

impl From<RepositoryError> for AppError {
    fn from(err: RepositoryError) -> Self {
        let kind = match &err {
            RepositoryError::NotFound { .. } => "repository_not_found",
            RepositoryError::AlreadyExists { .. } => "repository_already_exists",
            RepositoryError::NameFailed { .. } => "repo_name_failed",
            RepositoryError::MissingPath => "missing_path",
            RepositoryError::TimeError { .. } => "time_error",
        };

        let description = match &err {
            RepositoryError::NameFailed { source } => Some(source.to_string()),
            RepositoryError::TimeError { reason } => Some(reason.clone()),
            _ => None,
        };

        AppError::new(err.to_string(), kind, description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_not_found_to_legacy_kind() {
        let app: AppError = RepositoryError::NotFound {
            id: "abc-123".into(),
        }
        .into();
        assert_eq!(app.kind, "repository_not_found");
        assert!(app.message.contains("abc-123"));
    }

    #[test]
    fn maps_already_exists_to_legacy_kind() {
        let app: AppError = RepositoryError::AlreadyExists {
            name: "my-repo".into(),
        }
        .into();
        assert_eq!(app.kind, "repository_already_exists");
    }
}

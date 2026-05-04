use std::path::PathBuf;
use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum PathError {
    #[error("The folder **{name}** is not a git repository")]
    NotGitRepository { name: String, path: PathBuf },

    #[error("Failed to open git repository at {path}: {source}")]
    GitRepositoryOpenFailed {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read git repository config at {path}: {source}")]
    GitConfigUnreadable {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read git repository HEAD at {path}: {source}")]
    GitHeadUnreadable {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },

    #[error("Repository has no working directory")]
    NoWorkdir,
}

impl From<PathError> for AppError {
    fn from(err: PathError) -> Self {
        let kind = match &err {
            PathError::NotGitRepository { .. } => "is_not_git_repository",
            PathError::GitRepositoryOpenFailed { .. }
            | PathError::GitConfigUnreadable { .. }
            | PathError::GitHeadUnreadable { .. } => "git_repository_error",
            PathError::NoWorkdir => "no_workdir",
        };

        let description = match &err {
            PathError::NotGitRepository { path, .. } => Some(format!(
                "The path **{}** does not contain a .git directory",
                path.display()
            )),
            PathError::GitRepositoryOpenFailed { source, .. }
            | PathError::GitConfigUnreadable { source, .. }
            | PathError::GitHeadUnreadable { source, .. } => Some(source.to_string()),
            PathError::NoWorkdir => Some("The git repository is bare".to_string()),
        };

        AppError::new(err.to_string(), kind, description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_not_git_repository_to_legacy_kind() {
        let err = PathError::NotGitRepository {
            name: "my-folder".into(),
            path: PathBuf::from("/tmp/my-folder"),
        };
        let app: AppError = err.into();
        assert_eq!(app.kind, "is_not_git_repository");
        assert!(app.message.contains("my-folder"));
        assert!(app
            .description
            .unwrap()
            .contains("does not contain a .git directory"));
    }

    #[test]
    fn maps_no_workdir_to_legacy_kind() {
        let app: AppError = PathError::NoWorkdir.into();
        assert_eq!(app.kind, "no_workdir");
    }
}

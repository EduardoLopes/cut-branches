use git2::Repository;
use std::path::{Path, PathBuf};
use thiserror::Error;

use crate::shared::error::AppError;

/// Infrastructure error raised while validating that a path is a usable git
/// repository. It lives in shared infrastructure and depends only downward on
/// the shared kernel (`AppError`) — never on a domain (§3.2). Consuming domains
/// translate it into their own vocabulary via the `?`-driven `From` impl below.
#[derive(Debug, Error)]
pub enum RepoValidationError {
    #[error("Failed to open git repository at {path}: {source}")]
    OpenFailed {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read git repository config at {path}: {source}")]
    ConfigUnreadable {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },

    #[error("Failed to read git repository HEAD at {path}: {source}")]
    HeadUnreadable {
        path: PathBuf,
        #[source]
        source: git2::Error,
    },
}

impl From<RepoValidationError> for AppError {
    fn from(err: RepoValidationError) -> Self {
        let description = match &err {
            RepoValidationError::OpenFailed { source, .. }
            | RepoValidationError::ConfigUnreadable { source, .. }
            | RepoValidationError::HeadUnreadable { source, .. } => Some(source.to_string()),
        };
        AppError::new(err.to_string(), "git_repository_error", description)
    }
}

pub fn is_git_repository(path: &Path) -> Result<bool, RepoValidationError> {
    match Repository::open(path) {
        Ok(repo) => validate_repository(&repo, path),
        Err(source) => {
            if source.code() == git2::ErrorCode::NotFound {
                Ok(false)
            } else {
                Err(RepoValidationError::OpenFailed {
                    path: path.to_path_buf(),
                    source,
                })
            }
        }
    }
}

fn validate_repository(repo: &Repository, path: &Path) -> Result<bool, RepoValidationError> {
    if let Err(source) = repo.config() {
        return Err(RepoValidationError::ConfigUnreadable {
            path: path.to_path_buf(),
            source,
        });
    }

    match repo.head() {
        Ok(_) => Ok(true),
        Err(source) => {
            if repo.is_bare() {
                Ok(true)
            } else {
                Err(RepoValidationError::HeadUnreadable {
                    path: path.to_path_buf(),
                    source,
                })
            }
        }
    }
}

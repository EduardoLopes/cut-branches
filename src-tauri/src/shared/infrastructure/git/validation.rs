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
        // An unborn HEAD is a freshly `git init`ed repository with no commits
        // yet — a perfectly valid repository to register; the app already
        // tolerates an empty current branch. A bare repository has no working
        // HEAD either.
        Err(source) => {
            if source.code() == git2::ErrorCode::UnbornBranch || repo.is_bare() {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{run_git, setup_test_repo, DirectoryGuard};

    #[test]
    fn a_normal_repository_is_valid() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        assert!(is_git_repository(repo.path()).unwrap());
    }

    #[test]
    fn a_plain_directory_is_not_a_repository() {
        let _guard = DirectoryGuard::new();
        let dir = tempfile::tempdir().unwrap();
        assert!(!is_git_repository(dir.path()).unwrap());
    }

    /// A freshly initialised repository has an unborn HEAD (no commits yet).
    /// It is a perfectly usable repository — the app tolerates an empty
    /// current branch — so it must validate.
    #[test]
    fn a_repository_with_no_commits_is_valid() {
        let _guard = DirectoryGuard::new();
        let dir = tempfile::tempdir().unwrap();
        run_git(dir.path(), &["init"]);
        assert!(
            is_git_repository(dir.path()).unwrap(),
            "an unborn HEAD is still a repository"
        );
    }

    #[test]
    fn a_bare_repository_is_valid() {
        let _guard = DirectoryGuard::new();
        let dir = tempfile::tempdir().unwrap();
        run_git(dir.path(), &["init", "--bare"]);
        assert!(is_git_repository(dir.path()).unwrap());
    }

    #[test]
    fn validation_errors_carry_the_git_message() {
        let app: AppError = RepoValidationError::HeadUnreadable {
            path: PathBuf::from("/tmp/repo"),
            source: git2::Error::from_str("boom"),
        }
        .into();
        assert_eq!(app.kind, "git_repository_error");
        assert!(app.message.contains("/tmp/repo"));
        assert_eq!(app.description.as_deref(), Some("boom"));
    }
}

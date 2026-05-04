use git2::Repository;
use std::path::Path;

use crate::domains::path_operations::error::PathError;

pub fn is_git_repository(path: &Path) -> Result<bool, PathError> {
    match Repository::open(path) {
        Ok(repo) => validate_repository(&repo, path),
        Err(source) => {
            if source.code() == git2::ErrorCode::NotFound {
                Ok(false)
            } else {
                Err(PathError::GitRepositoryOpenFailed {
                    path: path.to_path_buf(),
                    source,
                })
            }
        }
    }
}

fn validate_repository(repo: &Repository, path: &Path) -> Result<bool, PathError> {
    if let Err(source) = repo.config() {
        return Err(PathError::GitConfigUnreadable {
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
                Err(PathError::GitHeadUnreadable {
                    path: path.to_path_buf(),
                    source,
                })
            }
        }
    }
}

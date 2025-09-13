use git2::Repository;
use std::path::Path;

use crate::shared::error::AppError;

/// Checks if the given path is a git repository.
///
/// # Arguments
///
/// * `path` - The path to check
///
/// # Returns
///
/// * `Result<bool, AppError>` - true if it's a git repository, or an error
pub fn is_git_repository(path: &Path) -> Result<bool, AppError> {
    match Repository::open(path) {
        Ok(repo) => validate_repository(&repo, path),
        Err(e) => {
            if e.code() == git2::ErrorCode::NotFound {
                Ok(false)
            } else {
                Err(AppError::new(
                    format!("Failed to open git repository at {}: {}", path.display(), e),
                    "git_repository_error",
                    Some(e.to_string()),
                ))
            }
        }
    }
}

/// Validates a git repository by checking its config and HEAD.
fn validate_repository(repo: &Repository, path: &Path) -> Result<bool, AppError> {
    // Check if config is valid
    if let Err(e) = repo.config() {
        return Err(AppError::new(
            format!(
                "Failed to read git repository config at {}: {}",
                path.display(),
                e
            ),
            "git_repository_error",
            Some(e.to_string()),
        ));
    }

    // Check if HEAD is valid
    match repo.head() {
        Ok(_) => Ok(true),
        Err(e) => {
            // If the repository is bare, it's still valid
            if repo.is_bare() {
                Ok(true)
            } else {
                Err(AppError::new(
                    format!(
                        "Failed to read git repository HEAD at {}: {}",
                        path.display(),
                        e
                    ),
                    "git_repository_error",
                    Some(e.to_string()),
                ))
            }
        }
    }
}

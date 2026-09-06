use git2::Repository;
use std::path::Path;

use crate::domains::path_operations::error::PathError;

/// Resolve the working-directory root of the git repository at `path`.
/// git2-backed infrastructure adapter for the `get_root_path` use-case.
pub fn resolve_workdir(path: &Path) -> Result<String, PathError> {
    let repo = Repository::open(path).map_err(|source| PathError::GitRepositoryOpenFailed {
        path: path.to_path_buf(),
        source,
    })?;

    let workdir = repo.workdir().ok_or(PathError::NoWorkdir)?;

    Ok(workdir.to_string_lossy().to_string())
}

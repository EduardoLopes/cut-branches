use git2::Repository;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::shared::error::AppError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RootPathResponse {
    pub root_path: String,
    pub id: Option<String>,
}

impl PartialEq for RootPathResponse {
    fn eq(&self, other: &Self) -> bool {
        self.root_path == other.root_path
    }
}

impl Eq for RootPathResponse {}

impl Hash for RootPathResponse {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.root_path.hash(state);
    }
}

/// Calculates a hash for a hashable type.
///
/// # Arguments
///
/// * `t` - The value to hash
///
/// # Returns
///
/// * `u64` - The calculated hash
fn calculate_hash<T: Hash + ?Sized>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}

// Import shared git validation
use crate::shared::git::is_git_repository;

/// Gets the root path of a git repository.
///
/// # Arguments
///
/// * `path` - Path to check for a git repository
///
/// # Returns
///
/// * `Result<RootPathResponse, AppError>` - The root path and ID, or an error
pub async fn get_root_path(path: String) -> Result<RootPathResponse, AppError> {
    let raw_path = Path::new(&path);

    if !is_git_repository(raw_path)? {
        return Err(AppError::new(
            format!(
                "The folder **{}** is not a git repository",
                raw_path
                    .file_name()
                    .unwrap_or(raw_path.as_os_str())
                    .to_string_lossy()
            ),
            "is_not_git_repository",
            Some(format!(
                "The path **{}** does not contain a .git directory",
                raw_path.display()
            )),
        ));
    }

    let repo = Repository::open(raw_path).map_err(|e| {
        AppError::new(
            format!("Failed to open git repository: {}", e),
            "git_repository_error",
            Some(e.to_string()),
        )
    })?;

    let workdir = repo.workdir().ok_or_else(|| {
        AppError::new(
            "Repository has no working directory".to_string(),
            "no_workdir",
            Some("The git repository is bare".to_string()),
        )
    })?;

    let rootpath = workdir.to_string_lossy().to_string();

    Ok(RootPathResponse {
        root_path: rootpath.clone(),
        id: Some(calculate_hash(&rootpath).to_string()),
    })
}

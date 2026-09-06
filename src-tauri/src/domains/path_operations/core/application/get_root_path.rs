use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::domains::path_operations::core::models::RootPathResponse;
use crate::domains::path_operations::error::PathError;
use crate::domains::path_operations::infrastructure::git::resolve_workdir;
use crate::shared::error::AppError;
use crate::shared::infrastructure::git::is_git_repository;

fn calculate_hash<T: Hash + ?Sized>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}

pub async fn get_root_path(path: String) -> Result<RootPathResponse, AppError> {
    let raw_path = Path::new(&path);

    if !is_git_repository(raw_path)? {
        return Err(PathError::NotGitRepository {
            name: raw_path
                .file_name()
                .unwrap_or(raw_path.as_os_str())
                .to_string_lossy()
                .into_owned(),
            path: raw_path.to_path_buf(),
        }
        .into());
    }

    let rootpath = resolve_workdir(raw_path)?;

    Ok(RootPathResponse {
        root_path: rootpath.clone(),
        id: Some(calculate_hash(&rootpath).to_string()),
    })
}

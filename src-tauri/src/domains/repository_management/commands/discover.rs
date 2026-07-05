use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::domains::repository_management::infrastructure::scanner;
use crate::shared::error::AppError;

/// Default maximum depth to descend below each scan root. Deep enough to reach
/// repositories nested a few folders down (e.g. `~/dev/org/project`) without
/// walking pathologically deep trees.
const DEFAULT_MAX_DEPTH: u32 = 6;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverRepositoriesInput {
    /// Directories to scan. When empty, the user's home directory is scanned.
    #[serde(default)]
    pub roots: Vec<String>,
    /// Maximum depth to descend below each root. Defaults to `DEFAULT_MAX_DEPTH`.
    #[serde(default)]
    pub max_depth: Option<u32>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredRepository {
    /// Absolute path to the repository's working directory.
    pub path: String,
    /// Folder name, used as the default display name.
    pub name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverRepositoriesOutput {
    /// Git repositories found under the scanned roots.
    pub repositories: Vec<DiscoveredRepository>,
    /// The roots that were actually scanned (resolved home directory when the
    /// caller passed no explicit roots).
    pub scanned_roots: Vec<String>,
}

/// Scans the filesystem for git repositories so the user can add many at once
/// instead of picking each folder by hand.
///
/// With no `roots`, the user's home directory is scanned. Scanning runs on the
/// blocking thread pool since large trees can take a moment to walk.
///
/// # Arguments
///
/// * `app` - App handle used to resolve the home directory
/// * `input` - Optional scan roots and depth
///
/// # Returns
///
/// * `Result<DiscoverRepositoriesOutput, AppError>` - Discovered repositories
///   and the roots that were scanned, or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn discover_repositories(
    app: AppHandle,
    input: DiscoverRepositoriesInput,
) -> Result<DiscoverRepositoriesOutput, AppError> {
    let roots: Vec<PathBuf> = if input.roots.is_empty() {
        let home = app.path().home_dir().map_err(|e| {
            AppError::new(
                "Could not determine your home directory".to_string(),
                "home_dir_unavailable",
                Some(e.to_string()),
            )
        })?;
        vec![home]
    } else {
        input.roots.iter().map(PathBuf::from).collect()
    };

    let max_depth = input.max_depth.unwrap_or(DEFAULT_MAX_DEPTH) as usize;

    let scanned_roots = roots
        .iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect();

    log::debug!(
        "discover_repositories scanning {} root(s) at depth {}",
        roots.len(),
        max_depth
    );

    // Filesystem walking can take a moment on large trees; run it on the
    // blocking pool so we don't stall the async runtime.
    let found = tokio::task::spawn_blocking(move || {
        scanner::find_git_repositories(&roots, max_depth)
    })
    .await
    .map_err(|e| {
        AppError::new(
            "Repository scan failed".to_string(),
            "scan_failed",
            Some(e.to_string()),
        )
    })?;

    let repositories = found
        .into_iter()
        .map(|path| {
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.to_string_lossy().into_owned());
            DiscoveredRepository {
                path: path.to_string_lossy().into_owned(),
                name,
            }
        })
        .collect();

    Ok(DiscoverRepositoriesOutput {
        repositories,
        scanned_roots,
    })
}

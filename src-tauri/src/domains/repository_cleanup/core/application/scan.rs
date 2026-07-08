//! Use-case: measure the cleanable folders in a single repository (§1.2).

use std::collections::HashSet;
use std::path::Path;

use crate::domains::repository_cleanup::core::models::cleanup_target::CleanupTarget;
use crate::domains::repository_cleanup::infrastructure::{scanner, sizing};

/// Find and size every cleanable folder in `repo_root`. Discovery combines the
/// built-in safety `allowlist` with the repo's `.gitignore` (allowlist matches
/// win classification). `on_progress(measured, current_path)` is called after
/// each folder is measured so the delivery layer can stream progress.
pub fn scan_cleanup_targets<F>(
    repo_root: &Path,
    allowlist: &HashSet<String>,
    mut on_progress: F,
) -> Vec<CleanupTarget>
where
    F: FnMut(u32, &Path),
{
    let gitignore = scanner::build_gitignore(repo_root);
    let found = scanner::find_cleanup_targets(repo_root, allowlist, gitignore.as_ref());

    let mut targets = Vec::with_capacity(found.len());
    for (index, item) in found.into_iter().enumerate() {
        let size_bytes = sizing::dir_size_bytes(&item.path);
        on_progress(index as u32 + 1, &item.path);
        targets.push(CleanupTarget {
            path: item.path.to_string_lossy().into_owned(),
            folder_name: item.folder_name,
            size_bytes,
            source: item.source,
        });
    }
    targets
}

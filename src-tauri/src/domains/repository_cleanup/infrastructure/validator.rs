//! Gathers the filesystem facts for a candidate target and hands them to the
//! pure `CleanTarget::from_facts` decision (§1.1 infrastructure → domain). This
//! is the only place that touches disk to answer "is this safe to delete?".

use std::collections::HashSet;
use std::path::Path;

use crate::domains::repository_cleanup::core::models::clean_target::{CleanTarget, TargetFacts};
use crate::domains::repository_cleanup::error::CleanupError;

/// Resolve and validate `target` against `repo_root`, returning a `CleanTarget`
/// only if every safeguard passes. Symlinks are detected before any
/// canonicalization so we never resolve through a link.
pub fn resolve_clean_target(
    repo_root: &Path,
    target: &Path,
    allowed: &HashSet<String>,
) -> Result<CleanTarget, CleanupError> {
    let repo_root_canonical =
        repo_root
            .canonicalize()
            .map_err(|_| CleanupError::PathOutsideRepository {
                path: target.to_path_buf(),
            })?;

    let symlink_meta = std::fs::symlink_metadata(target);
    let exists = symlink_meta.is_ok();
    let is_symlink = symlink_meta
        .as_ref()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false);
    let is_dir = symlink_meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);

    // Only resolve real paths; a symlink is rejected by the decision anyway.
    let target_canonical = if exists && !is_symlink {
        target
            .canonicalize()
            .unwrap_or_else(|_| target.to_path_buf())
    } else {
        target.to_path_buf()
    };

    let folder_name = target.file_name().map(|n| n.to_string_lossy().into_owned());

    CleanTarget::from_facts(
        TargetFacts {
            repo_root_canonical: &repo_root_canonical,
            target_canonical: &target_canonical,
            target_original: target,
            exists,
            is_symlink,
            is_dir,
            folder_name,
        },
        allowed,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn allow(names: &[&str]) -> HashSet<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn validates_real_allowlisted_dir() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let target = root.join("node_modules");
        fs::create_dir_all(&target).unwrap();

        let ct = resolve_clean_target(root, &target, &allow(&["node_modules"])).unwrap();
        assert_eq!(ct.path(), target.canonicalize().unwrap());
    }

    #[test]
    fn rejects_target_outside_root() {
        let tmp = TempDir::new().unwrap();
        let other = TempDir::new().unwrap();
        let target = other.path().join("node_modules");
        fs::create_dir_all(&target).unwrap();

        assert!(matches!(
            resolve_clean_target(tmp.path(), &target, &allow(&["node_modules"])),
            Err(CleanupError::PathOutsideRepository { .. })
        ));
    }

    #[test]
    fn rejects_missing_target() {
        let tmp = TempDir::new().unwrap();
        let target = tmp.path().join("gone");
        assert!(matches!(
            resolve_clean_target(tmp.path(), &target, &allow(&["gone"])),
            Err(CleanupError::TargetNotFound { .. })
        ));
    }

    #[test]
    fn rejects_non_allowlisted_dir() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let target = root.join("src");
        fs::create_dir_all(&target).unwrap();
        assert!(matches!(
            resolve_clean_target(root, &target, &allow(&["node_modules"])),
            Err(CleanupError::NotAllowlisted { .. })
        ));
    }
}

//! Gathers the filesystem facts for a candidate target and hands them to the
//! pure `CleanTarget::from_facts` decision (§1.1 infrastructure → domain). This
//! is the only place that touches disk to answer "is this safe to delete?".
//!
//! The "is it ignored?" fact is re-derived here from the repository's own
//! `.gitignore` stack via `scanner::is_ignored_dir` — the same evaluator
//! discovery uses — so the deletion boundary can never accept something that
//! discovery wouldn't have proposed, no matter what the caller sends (§3).

use std::path::Path;

use crate::domains::repository_cleanup::core::models::clean_target::{CleanTarget, TargetFacts};
use crate::domains::repository_cleanup::error::CleanupError;
use crate::domains::repository_cleanup::infrastructure::scanner;

/// Resolve and validate `target` against `repo_root`, returning a `CleanTarget`
/// only if every safeguard passes. Symlinks are detected before any
/// canonicalization so we never resolve through a link.
pub fn resolve_clean_target(repo_root: &Path, target: &Path) -> Result<CleanTarget, CleanupError> {
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

    // Re-derive the ignore verdict from the repo's own .gitignore stack.
    let is_ignored = scanner::is_ignored_dir(&repo_root_canonical, &target_canonical);

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
        is_ignored,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn validates_real_ignored_dir() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "node_modules/\n").unwrap();
        let target = root.join("node_modules");
        fs::create_dir_all(&target).unwrap();

        let ct = resolve_clean_target(root, &target).unwrap();
        assert_eq!(ct.path(), target.canonicalize().unwrap());
    }

    #[test]
    fn rejects_target_outside_root() {
        let tmp = TempDir::new().unwrap();
        let other = TempDir::new().unwrap();
        fs::write(other.path().join(".gitignore"), "node_modules/\n").unwrap();
        let target = other.path().join("node_modules");
        fs::create_dir_all(&target).unwrap();

        assert!(matches!(
            resolve_clean_target(tmp.path(), &target),
            Err(CleanupError::PathOutsideRepository { .. })
        ));
    }

    #[test]
    fn rejects_missing_target() {
        let tmp = TempDir::new().unwrap();
        let target = tmp.path().join("gone");
        assert!(matches!(
            resolve_clean_target(tmp.path(), &target),
            Err(CleanupError::TargetNotFound { .. })
        ));
    }

    #[test]
    fn rejects_non_ignored_dir() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        // A real folder that the .gitignore does NOT ignore.
        fs::write(root.join(".gitignore"), "dist/\n").unwrap();
        let target = root.join("src");
        fs::create_dir_all(&target).unwrap();
        assert!(matches!(
            resolve_clean_target(root, &target),
            Err(CleanupError::NotIgnored { .. })
        ));
    }
}

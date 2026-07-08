//! The safety gate for deletion. `CleanTarget` can only be constructed by
//! passing the pure `from_facts` decision — so holding one is proof the path
//! cleared every safeguard (§1.2 value object). The decision is pure: the
//! caller (infrastructure) gathers the filesystem facts, this decides. That
//! keeps the security-critical rule unit-testable without touching disk.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::domains::repository_cleanup::error::CleanupError;

/// Filesystem facts about a candidate target, gathered by infrastructure.
pub struct TargetFacts<'a> {
    /// Canonicalized repository working-directory root.
    pub repo_root_canonical: &'a Path,
    /// Canonicalized target path (symlinks already resolved).
    pub target_canonical: &'a Path,
    /// The path as the caller supplied it, used only for error messages.
    pub target_original: &'a Path,
    pub exists: bool,
    pub is_symlink: bool,
    pub is_dir: bool,
    /// The target's own last path component, if any.
    pub folder_name: Option<String>,
}

/// A path that has passed every deletion safeguard.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CleanTarget(PathBuf);

impl CleanTarget {
    /// Decide whether `facts` describe a safe-to-delete target. Fails closed:
    /// anything ambiguous is refused. Order matters — existence and symlink
    /// checks come first so we never resolve or delete through a link.
    pub fn from_facts(facts: TargetFacts, allowed: &HashSet<String>) -> Result<Self, CleanupError> {
        let original = || facts.target_original.to_path_buf();

        if !facts.exists {
            return Err(CleanupError::TargetNotFound { path: original() });
        }
        if facts.is_symlink {
            return Err(CleanupError::RefusedSymlink { path: original() });
        }
        if !facts.is_dir {
            return Err(CleanupError::NotADirectory { path: original() });
        }

        // Must live strictly inside the repository root.
        if facts.target_canonical == facts.repo_root_canonical {
            return Err(CleanupError::RefusedRepoRoot { path: original() });
        }
        if !facts
            .target_canonical
            .starts_with(facts.repo_root_canonical)
        {
            return Err(CleanupError::PathOutsideRepository { path: original() });
        }

        // Never touch git metadata, whatever the allowlist says.
        let name = facts.folder_name.unwrap_or_default();
        if name == ".git"
            || facts
                .target_canonical
                .components()
                .any(|c| c.as_os_str() == ".git")
        {
            return Err(CleanupError::RefusedRepoRoot { path: original() });
        }

        // Final gate: the folder name must be explicitly approved.
        if !allowed.contains(&name) {
            return Err(CleanupError::NotAllowlisted { name });
        }

        Ok(CleanTarget(facts.target_canonical.to_path_buf()))
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed(names: &[&str]) -> HashSet<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    fn facts<'a>(root: &'a Path, target: &'a Path, name: &str) -> TargetFacts<'a> {
        TargetFacts {
            repo_root_canonical: root,
            target_canonical: target,
            target_original: target,
            exists: true,
            is_symlink: false,
            is_dir: true,
            folder_name: Some(name.to_string()),
        }
    }

    #[test]
    fn accepts_allowlisted_dir_inside_repo() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/node_modules");
        let t = CleanTarget::from_facts(
            facts(root, target, "node_modules"),
            &allowed(&["node_modules"]),
        )
        .unwrap();
        assert_eq!(t.path(), target);
    }

    #[test]
    fn rejects_missing_target() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/node_modules");
        let mut f = facts(root, target, "node_modules");
        f.exists = false;
        assert!(matches!(
            CleanTarget::from_facts(f, &allowed(&["node_modules"])),
            Err(CleanupError::TargetNotFound { .. })
        ));
    }

    #[test]
    fn rejects_symlink() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/node_modules");
        let mut f = facts(root, target, "node_modules");
        f.is_symlink = true;
        assert!(matches!(
            CleanTarget::from_facts(f, &allowed(&["node_modules"])),
            Err(CleanupError::RefusedSymlink { .. })
        ));
    }

    #[test]
    fn rejects_non_directory() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/file.txt");
        let mut f = facts(root, target, "file.txt");
        f.is_dir = false;
        assert!(matches!(
            CleanTarget::from_facts(f, &allowed(&["file.txt"])),
            Err(CleanupError::NotADirectory { .. })
        ));
    }

    #[test]
    fn rejects_repo_root_itself() {
        let root = Path::new("/repo");
        let target = Path::new("/repo");
        assert!(matches!(
            CleanTarget::from_facts(facts(root, target, "repo"), &allowed(&["repo"])),
            Err(CleanupError::RefusedRepoRoot { .. })
        ));
    }

    #[test]
    fn rejects_path_outside_repo() {
        let root = Path::new("/repo");
        let target = Path::new("/other/node_modules");
        assert!(matches!(
            CleanTarget::from_facts(
                facts(root, target, "node_modules"),
                &allowed(&["node_modules"])
            ),
            Err(CleanupError::PathOutsideRepository { .. })
        ));
    }

    #[test]
    fn rejects_git_directory_even_if_allowlisted() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/.git");
        assert!(matches!(
            CleanTarget::from_facts(facts(root, target, ".git"), &allowed(&[".git"])),
            Err(CleanupError::RefusedRepoRoot { .. })
        ));
    }

    #[test]
    fn rejects_non_allowlisted_name() {
        let root = Path::new("/repo");
        let target = Path::new("/repo/src");
        assert!(matches!(
            CleanTarget::from_facts(facts(root, target, "src"), &allowed(&["node_modules"])),
            Err(CleanupError::NotAllowlisted { .. })
        ));
    }
}

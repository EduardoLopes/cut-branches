//! Filesystem scanner that discovers git repositories under a set of root
//! directories. This is infrastructure (§1.1): it performs raw filesystem I/O
//! and depends on the shared git-validation helper. The delivery command
//! (`discover_repositories`) resolves the roots and maps results into DTOs.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::shared::infrastructure::git::is_git_repository;

/// Directory names never worth descending into during a scan: package caches,
/// build outputs, and OS/system folders that never hold user git repositories
/// but are enormous to walk. Names starting with `.` are pruned separately.
const PRUNED_DIR_NAMES: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
    "Library",
    "Applications",
    "System",
    ".Trash",
    "$RECYCLE.BIN",
];

/// Upper bound on the number of repositories returned by a single scan, so a
/// scan rooted at a huge tree can't produce an unbounded payload or UI list.
const MAX_RESULTS: usize = 1000;

/// Recursively scans `roots` for git repositories, descending at most
/// `max_depth` levels below each root.
///
/// A directory is treated as a repository root when it contains a `.git` entry
/// and passes [`is_git_repository`]; the scan records it and does **not**
/// descend into it (nested repos/submodules are intentionally skipped). Hidden
/// directories, known build/cache/system directories, and symlinks are pruned.
///
/// Results are de-duplicated by canonical path and capped at [`MAX_RESULTS`].
/// Recursively scans `roots` for git repositories, invoking
/// `on_progress(scanned_dirs, found_count, current_dir)` as the walk proceeds so
/// callers can surface live progress. It is called roughly once per directory
/// visited — throttle inside the callback if emissions are expensive.
pub fn find_git_repositories_reporting<F>(
    roots: &[PathBuf],
    max_depth: usize,
    on_progress: F,
) -> Vec<PathBuf>
where
    F: FnMut(u32, u32, Option<&Path>),
{
    walk(
        roots,
        max_depth,
        |path| matches!(is_git_repository(path), Ok(true)),
        on_progress,
    )
}

/// Core traversal, generic over the "is this a repository?" predicate (so the
/// pruning/depth/dedup logic can be tested without creating real git repos) and
/// a progress callback.
fn walk<R, F>(roots: &[PathBuf], max_depth: usize, is_repo: R, mut on_progress: F) -> Vec<PathBuf>
where
    R: Fn(&Path) -> bool,
    F: FnMut(u32, u32, Option<&Path>),
{
    let mut found: Vec<PathBuf> = Vec::new();
    let mut seen: HashSet<PathBuf> = HashSet::new();
    // Explicit DFS stack of (directory, depth-below-its-root).
    let mut stack: Vec<(PathBuf, usize)> = Vec::new();
    let mut scanned_dirs: u32 = 0;

    for root in roots {
        if root.is_dir() {
            stack.push((root.clone(), 0));
        }
    }

    while let Some((dir, depth)) = stack.pop() {
        if found.len() >= MAX_RESULTS {
            break;
        }

        scanned_dirs = scanned_dirs.saturating_add(1);
        on_progress(scanned_dirs, found.len() as u32, Some(&dir));

        // A directory that is itself a repository is recorded and not descended
        // into: nested repositories and submodules are deliberately skipped.
        if dir.join(".git").exists() && is_repo(&dir) {
            let key = dir.canonicalize().unwrap_or_else(|_| dir.clone());
            if seen.insert(key) {
                found.push(dir);
            }
            continue;
        }

        if depth >= max_depth {
            continue;
        }

        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            // Unreadable directory (permissions, race with deletion): skip it.
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            // Never follow symlinks: avoids cycles and escaping the root tree.
            if file_type.is_symlink() || !file_type.is_dir() {
                continue;
            }
            let name = entry.file_name();
            if is_pruned_dir(&name.to_string_lossy()) {
                continue;
            }
            stack.push((entry.path(), depth + 1));
        }
    }

    found
}

/// Whether a directory with this name should be skipped entirely: hidden
/// directories (leading `.`) and the well-known heavy/system directories.
fn is_pruned_dir(name: &str) -> bool {
    name.starts_with('.') || PRUNED_DIR_NAMES.contains(&name)
}

/// Test helper: walk with the given repository predicate and no progress
/// reporting.
#[cfg(test)]
fn find_git_repositories_with<F: Fn(&Path) -> bool>(
    roots: &[PathBuf],
    max_depth: usize,
    is_repo: F,
) -> Vec<PathBuf> {
    walk(roots, max_depth, is_repo, |_, _, _| {})
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Marks a directory as a repository for the injectable predicate by
    /// creating an empty `.git` directory inside it.
    fn mark_repo(path: &Path) {
        fs::create_dir_all(path.join(".git")).unwrap();
    }

    /// Predicate used in traversal tests: any directory carrying a `.git`
    /// marker counts as a repository (no real git metadata required).
    fn has_git_marker(path: &Path) -> bool {
        path.join(".git").is_dir()
    }

    #[test]
    fn finds_repositories_at_various_depths() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        mark_repo(&root.join("top-level"));
        mark_repo(&root.join("nested/inner/project"));

        let found = find_git_repositories_with(&[root.to_path_buf()], 10, has_git_marker);

        assert_eq!(found.len(), 2);
        assert!(found.contains(&root.join("top-level")));
        assert!(found.contains(&root.join("nested/inner/project")));
    }

    #[test]
    fn does_not_descend_into_a_found_repository() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        mark_repo(&root.join("outer"));
        // A nested repo (e.g. a submodule) inside the found repo must be skipped.
        mark_repo(&root.join("outer/submodule"));

        let found = find_git_repositories_with(&[root.to_path_buf()], 10, has_git_marker);

        assert_eq!(found, vec![root.join("outer")]);
    }

    #[test]
    fn respects_max_depth() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // Repo lives 3 levels below the root; a max_depth of 1 can't reach it.
        mark_repo(&root.join("a/b/c/repo"));

        let shallow = find_git_repositories_with(&[root.to_path_buf()], 1, has_git_marker);
        assert!(shallow.is_empty());

        let deep = find_git_repositories_with(&[root.to_path_buf()], 10, has_git_marker);
        assert_eq!(deep, vec![root.join("a/b/c/repo")]);
    }

    #[test]
    fn prunes_hidden_and_heavy_directories() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        mark_repo(&root.join(".hidden/repo"));
        mark_repo(&root.join("node_modules/pkg/repo"));
        mark_repo(&root.join("keep/repo"));

        let found = find_git_repositories_with(&[root.to_path_buf()], 10, has_git_marker);

        assert_eq!(found, vec![root.join("keep/repo")]);
    }

    #[test]
    fn deduplicates_repositories_reached_via_multiple_roots() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        mark_repo(&root.join("shared"));

        // Same subtree passed twice as roots must yield the repo only once.
        let found = find_git_repositories_with(
            &[root.to_path_buf(), root.to_path_buf()],
            10,
            has_git_marker,
        );

        assert_eq!(found.len(), 1);
    }

    #[test]
    fn skips_non_directory_and_missing_roots() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("a-file");
        fs::write(&file, b"not a dir").unwrap();
        let missing = tmp.path().join("does-not-exist");

        let found = find_git_repositories_with(&[file, missing], 10, has_git_marker);
        assert!(found.is_empty());
    }

    #[test]
    fn a_root_that_is_itself_a_repository_is_returned() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("repo");
        mark_repo(&repo);

        let found = find_git_repositories_with(std::slice::from_ref(&repo), 10, has_git_marker);
        assert_eq!(found, vec![repo]);
    }

    #[test]
    fn default_predicate_validates_real_git_repositories() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // A directory with a bare `.git` marker but no real git metadata must
        // NOT be reported by the production (real-git) predicate.
        mark_repo(&root.join("fake"));

        // A real, committed repository must be reported.
        let real = root.join("real");
        fs::create_dir_all(&real).unwrap();
        init_repo_with_commit(&real);

        let found = find_git_repositories_reporting(&[root.to_path_buf()], 10, |_, _, _| {});
        assert_eq!(found, vec![real]);
    }

    /// Initializes a git repository with a single empty commit so that
    /// `is_git_repository` (which requires a readable HEAD) returns `Ok(true)`.
    fn init_repo_with_commit(path: &Path) {
        let repo = git2::Repository::init(path).unwrap();
        let sig = git2::Signature::now("Test", "test@example.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[])
            .unwrap();
    }
}

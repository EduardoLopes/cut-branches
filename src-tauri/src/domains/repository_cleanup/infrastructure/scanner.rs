//! Finds cleanable folders inside a single repository (§1.1 infrastructure).
//!
//! Discovery is driven entirely by the repository's own `.gitignore` stack:
//! the root `.gitignore`, every nested `.gitignore`, and `.git/info/exclude`.
//! A directory is a cleanup target when that stack ignores it. Matched targets
//! are recorded and not descended into; `.git` is never touched; symlinks are
//! never followed (avoids cycles and escaping the tree).
//!
//! The same ignore rule guards discovery here AND the deletion boundary in the
//! validator — both go through [`evaluate_ignored`]. Keeping a single evaluator
//! is deliberate: a destructive command must never accept something discovery
//! wouldn't have shown. The user's *global* gitignore (`core.excludesFile`) is
//! intentionally NOT consulted, so the boundary depends only on the repo's own
//! contents and is deterministic across machines. Any parse/build failure
//! fails closed (contributes nothing / not deletable).

use std::path::{Path, PathBuf};
use std::rc::Rc;

use ignore::gitignore::{Gitignore, GitignoreBuilder};
use ignore::Match;

/// A cleanable directory found by the walk, before its size is measured.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FoundTarget {
    pub path: PathBuf,
    pub folder_name: String,
}

/// Builds a `.gitignore` matcher rooted at `dir` from that directory's
/// `.gitignore` (and, at the repo root, `.git/info/exclude`). Returns `None`
/// when there is nothing to load or it fails to parse (fail-closed).
fn load_dir_ignore(dir: &Path, include_git_exclude: bool) -> Option<Gitignore> {
    let mut builder = GitignoreBuilder::new(dir);
    let mut any = false;

    let gitignore_path = dir.join(".gitignore");
    if gitignore_path.is_file() {
        builder.add(&gitignore_path);
        any = true;
    }

    if include_git_exclude {
        let exclude_path = dir.join(".git").join("info").join("exclude");
        if exclude_path.is_file() {
            builder.add(&exclude_path);
            any = true;
        }
    }

    if !any {
        return None;
    }
    builder.build().ok()
}

/// Decide whether `path` is ignored by the gitignore `chain`, evaluated from
/// innermost (deepest directory, first in the slice) to outermost. The first
/// explicit match wins — a deeper `.gitignore` overrides a shallower one, and a
/// whitelist (`!pattern`) un-ignores. No match anywhere → not ignored.
///
/// This is the single source of truth for "is this ignored?", shared by
/// discovery and the deletion boundary.
fn evaluate_ignored(chain: &[Rc<Gitignore>], path: &Path, is_dir: bool) -> bool {
    for gi in chain {
        match gi.matched(path, is_dir) {
            Match::Ignore(_) => return true,
            Match::Whitelist(_) => return false,
            Match::None => continue,
        }
    }
    false
}

/// Walks `repo_root` and returns every directory ignored by the repo's
/// `.gitignore` stack. Ignored directories are recorded and not descended into;
/// ignored files are skipped; `.git` and symlinks are never touched.
pub fn find_cleanup_targets(repo_root: &Path) -> Vec<FoundTarget> {
    let mut found: Vec<FoundTarget> = Vec::new();

    // The chain applicable to a directory's direct children, innermost first.
    // The root frame carries the root `.gitignore` + `.git/info/exclude`.
    let root_chain: Vec<Rc<Gitignore>> = load_dir_ignore(repo_root, true)
        .map(|gi| vec![Rc::new(gi)])
        .unwrap_or_default();

    let mut stack: Vec<(PathBuf, Vec<Rc<Gitignore>>)> =
        vec![(repo_root.to_path_buf(), root_chain)];

    while let Some((dir, chain)) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            // Never follow symlinks; only directories can be cleanup targets.
            if file_type.is_symlink() || !file_type.is_dir() {
                continue;
            }

            let name = entry.file_name().to_string_lossy().into_owned();
            // Git metadata is off-limits and never descended into.
            if name == ".git" {
                continue;
            }
            let path = entry.path();

            if evaluate_ignored(&chain, &path, true) {
                found.push(FoundTarget {
                    path,
                    folder_name: name,
                });
                continue; // do not descend into a matched target
            }

            // Descend: extend the chain with this directory's own `.gitignore`
            // as the new innermost entry.
            let mut child_chain = chain.clone();
            if let Some(gi) = load_dir_ignore(&path, false) {
                child_chain.insert(0, Rc::new(gi));
            }
            stack.push((path, child_chain));
        }
    }

    found
}

/// Whether `target` (a directory) is ignored by `repo_root`'s gitignore stack.
/// Rebuilds the chain from `repo_root` down to the target's parent and applies
/// the same [`evaluate_ignored`] rule used by discovery — so the deletion
/// boundary is server-derived and can never diverge from what was proposed.
/// Both paths should be canonical. Fails closed (returns `false`) on any error.
pub fn is_ignored_dir(repo_root: &Path, target: &Path) -> bool {
    let parent = match target.parent() {
        Some(p) => p,
        None => return false,
    };

    // Collect the gitignore of every directory from the target's parent up to
    // (and including) the repo root — parent first, so innermost is first.
    let mut chain: Vec<Rc<Gitignore>> = Vec::new();
    let mut dir = parent;
    loop {
        let is_root = dir == repo_root;
        if let Some(gi) = load_dir_ignore(dir, is_root) {
            chain.push(Rc::new(gi));
        }
        if is_root {
            break;
        }
        match dir.parent() {
            Some(p) => dir = p,
            // Walked above the repo root without reaching it (target outside the
            // repo). from_facts rejects that case separately; nothing ignores it.
            None => break,
        }
    }

    evaluate_ignored(&chain, target, true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn names(found: &[FoundTarget]) -> Vec<&str> {
        found.iter().map(|f| f.folder_name.as_str()).collect()
    }

    #[test]
    fn finds_gitignored_directories_and_does_not_descend() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "node_modules/\n").unwrap();
        fs::create_dir_all(root.join("node_modules/pkg/node_modules")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        let found = find_cleanup_targets(root);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].folder_name, "node_modules");
        assert_eq!(found[0].path, root.join("node_modules"));
    }

    #[test]
    fn no_gitignore_yields_nothing() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        let found = find_cleanup_targets(root);
        assert!(found.is_empty());
    }

    #[test]
    fn skips_git_directory() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "dist/\n").unwrap();
        fs::create_dir_all(root.join(".git/objects")).unwrap();
        fs::create_dir_all(root.join("dist")).unwrap();

        assert_eq!(names(&find_cleanup_targets(root)), vec!["dist"]);
    }

    #[test]
    fn honors_nested_gitignore() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        // Root ignores nothing relevant; a nested package ignores its own build.
        fs::write(root.join(".gitignore"), "\n").unwrap();
        fs::create_dir_all(root.join("packages/x")).unwrap();
        fs::write(root.join("packages/x/.gitignore"), "build/\n").unwrap();
        fs::create_dir_all(root.join("packages/x/build/artifacts")).unwrap();
        fs::create_dir_all(root.join("packages/x/src")).unwrap();

        let found = find_cleanup_targets(root);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].folder_name, "build");
        assert_eq!(found[0].path, root.join("packages/x/build"));
    }

    #[test]
    fn whitelist_reinclude_keeps_directory() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        // Ignore all top-level "build" but re-include "keep".
        fs::write(root.join(".gitignore"), "build/\n!keep/\n").unwrap();
        fs::create_dir_all(root.join("build")).unwrap();
        fs::create_dir_all(root.join("keep")).unwrap();

        let found = find_cleanup_targets(root);
        assert_eq!(names(&find_cleanup_targets(root)), vec!["build"]);
        assert!(!found.iter().any(|f| f.folder_name == "keep"));
    }

    #[test]
    fn honors_git_info_exclude() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(".git/info")).unwrap();
        fs::write(root.join(".git/info/exclude"), "coverage/\n").unwrap();
        fs::create_dir_all(root.join("coverage/tmp")).unwrap();

        assert_eq!(names(&find_cleanup_targets(root)), vec!["coverage"]);
    }

    #[test]
    fn is_ignored_dir_agrees_with_discovery() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        fs::write(root.join(".gitignore"), "build/\n!keep/\n").unwrap();
        fs::create_dir_all(root.join("build")).unwrap();
        fs::create_dir_all(root.join("keep")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        assert!(is_ignored_dir(&root, &root.join("build")));
        assert!(!is_ignored_dir(&root, &root.join("keep")));
        assert!(!is_ignored_dir(&root, &root.join("src")));
    }

    #[test]
    fn is_ignored_dir_honors_nested_gitignore() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        fs::create_dir_all(root.join("packages/x")).unwrap();
        fs::write(root.join("packages/x/.gitignore"), "build/\n").unwrap();
        fs::create_dir_all(root.join("packages/x/build")).unwrap();

        assert!(is_ignored_dir(&root, &root.join("packages/x/build")));
    }

    #[test]
    fn is_ignored_dir_false_without_gitignore() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        fs::create_dir_all(root.join("node_modules")).unwrap();
        assert!(!is_ignored_dir(&root, &root.join("node_modules")));
    }
}

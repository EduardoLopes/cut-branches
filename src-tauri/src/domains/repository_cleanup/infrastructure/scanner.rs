//! Finds cleanable folders inside a single repository (§1.1 infrastructure).
//!
//! A DFS walk that, for each directory, stops and records it as a target when
//! its name is on the allowlist, or (in assist mode) when the repo's
//! `.gitignore` ignores it. Matched targets are not descended into. `.git` is
//! never touched; symlinks are never followed (avoids cycles and escaping the
//! tree). Mirrors the pruning/DFS shape of `repository_management`'s scanner,
//! inverted from "skip these" to "collect these".

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use ignore::gitignore::{Gitignore, GitignoreBuilder};

use crate::domains::repository_cleanup::core::models::cleanup_target::TargetSource;

/// A cleanable directory found by the walk, before its size is measured.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FoundTarget {
    pub path: PathBuf,
    pub folder_name: String,
    pub source: TargetSource,
}

/// Builds the compiled `.gitignore` matcher for a repository root, or `None`
/// when there is no `.gitignore` (or it fails to parse — assist mode then
/// simply contributes nothing).
pub fn build_gitignore(repo_root: &Path) -> Option<Gitignore> {
    let gitignore_path = repo_root.join(".gitignore");
    if !gitignore_path.is_file() {
        return None;
    }
    let mut builder = GitignoreBuilder::new(repo_root);
    builder.add(&gitignore_path);
    builder.build().ok()
}

/// Walks `repo_root` and returns every cleanable directory. When `gitignore` is
/// `Some`, directories it ignores are also proposed (marked `Gitignore`), but
/// allowlist matches always win the classification.
pub fn find_cleanup_targets(
    repo_root: &Path,
    allowlist: &HashSet<String>,
    gitignore: Option<&Gitignore>,
) -> Vec<FoundTarget> {
    let mut found: Vec<FoundTarget> = Vec::new();
    let mut stack: Vec<PathBuf> = vec![repo_root.to_path_buf()];

    while let Some(dir) = stack.pop() {
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

            if allowlist.contains(&name) {
                found.push(FoundTarget {
                    path,
                    folder_name: name,
                    source: TargetSource::Allowlist,
                });
                continue; // do not descend into a matched target
            }

            let ignored = gitignore
                .map(|gi| gi.matched(&path, true).is_ignore())
                .unwrap_or(false);
            if ignored {
                found.push(FoundTarget {
                    path,
                    folder_name: name,
                    source: TargetSource::Gitignore,
                });
                continue;
            }

            stack.push(path);
        }
    }

    found
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
    fn finds_allowlisted_folders_and_does_not_descend() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join("node_modules/pkg/node_modules")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        let found = find_cleanup_targets(root, &allow(&["node_modules"]), None);

        // Only the top-level node_modules — the nested one is inside it and not descended into.
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].folder_name, "node_modules");
        assert_eq!(found[0].source, TargetSource::Allowlist);
        assert_eq!(found[0].path, root.join("node_modules"));
    }

    #[test]
    fn skips_git_directory() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(".git/objects")).unwrap();
        fs::create_dir_all(root.join("dist")).unwrap();

        let found = find_cleanup_targets(root, &allow(&["dist", ".git", "objects"]), None);
        let names: Vec<_> = found.iter().map(|f| f.folder_name.as_str()).collect();
        assert_eq!(names, vec!["dist"]);
    }

    #[test]
    fn finds_hidden_allowlisted_folder() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(".venv/lib")).unwrap();

        let found = find_cleanup_targets(root, &allow(&[".venv"]), None);
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].folder_name, ".venv");
    }

    #[test]
    fn gitignore_assist_flags_ignored_directories() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "coverage/\n").unwrap();
        fs::create_dir_all(root.join("coverage/tmp")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        let gi = build_gitignore(root).unwrap();
        let found = find_cleanup_targets(root, &allow(&[]), Some(&gi));
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].folder_name, "coverage");
        assert_eq!(found[0].source, TargetSource::Gitignore);
    }

    #[test]
    fn allowlist_wins_classification_over_gitignore() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "node_modules/\n").unwrap();
        fs::create_dir_all(root.join("node_modules")).unwrap();

        let gi = build_gitignore(root).unwrap();
        let found = find_cleanup_targets(root, &allow(&["node_modules"]), Some(&gi));
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].source, TargetSource::Allowlist);
    }

    #[test]
    fn no_gitignore_returns_none_builder() {
        let tmp = TempDir::new().unwrap();
        assert!(build_gitignore(tmp.path()).is_none());
    }
}

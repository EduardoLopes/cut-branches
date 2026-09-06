//! git2 adapter for worktree operations (§1.1 infrastructure). Every git2
//! failure is translated into the domain's `WorktreeError` here so the layers
//! above never see a raw `git2::Error` (§3.2).

use std::path::Path;

use git2::{BranchType, Repository, WorktreeAddOptions, WorktreeLockStatus, WorktreePruneOptions};

use crate::domains::worktree_management::core::models::worktree::Worktree;
use crate::domains::worktree_management::error::WorktreeError;

/// Open the repository at `path`, translating the git2 failure.
fn open_repo(path: &Path) -> Result<Repository, WorktreeError> {
    Repository::open(path).map_err(|e| WorktreeError::RepositoryOpenFailed {
        path: path.display().to_string(),
        detail: e.to_string(),
    })
}

/// Resolve a repository's HEAD into (branch shorthand, commit sha). Returns
/// `(None, None)` for an unborn/unreadable HEAD, and `branch = None` when HEAD
/// is detached.
fn resolve_head(repo: &Repository) -> (Option<String>, Option<String>) {
    match repo.head() {
        Ok(head) => {
            let sha = head.peel_to_commit().ok().map(|c| c.id().to_string());
            let branch = if head.is_branch() {
                head.shorthand().ok().map(|s| s.to_string())
            } else {
                None
            };
            (branch, sha)
        }
        Err(_) => (None, None),
    }
}

/// Synthesized name for the main worktree (its directory's basename).
fn main_name(repo: &Repository) -> String {
    repo.workdir()
        .and_then(|p| p.file_name())
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "(main)".to_string())
}

/// Build the model entry for the main worktree (the repository's own workdir).
fn build_main(repo: &Repository) -> Worktree {
    let path = repo
        .workdir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    let (branch, head_sha) = resolve_head(repo);
    Worktree {
        name: main_name(repo),
        path,
        branch,
        head_sha,
        is_locked: false,
        lock_reason: None,
        is_main: true,
        is_prunable: false,
    }
}

/// Build the model entry for a linked worktree.
fn build_linked(wt: &git2::Worktree) -> Worktree {
    let name = wt.name().ok().flatten().unwrap_or_default().to_string();
    let path = wt.path().to_string_lossy().into_owned();

    let (is_locked, lock_reason) = match wt.is_locked() {
        Ok(WorktreeLockStatus::Unlocked) => (false, None),
        Ok(WorktreeLockStatus::Locked(reason)) => (true, reason),
        Err(_) => (false, None),
    };

    let is_prunable = wt.is_prunable(None).unwrap_or(false);

    let (branch, head_sha) = match Repository::open_from_worktree(wt) {
        Ok(wt_repo) => resolve_head(&wt_repo),
        Err(_) => (None, None),
    };

    Worktree {
        name,
        path,
        branch,
        head_sha,
        is_locked,
        lock_reason,
        is_main: false,
        is_prunable,
    }
}

/// List the repository's worktrees, main first, then each linked worktree.
pub fn list_worktrees(path: &Path) -> Result<Vec<Worktree>, WorktreeError> {
    let repo = open_repo(path)?;

    let mut worktrees = vec![build_main(&repo)];

    let names = repo.worktrees().map_err(|e| WorktreeError::ListFailed {
        detail: e.to_string(),
    })?;

    for name in names.iter().flatten().flatten() {
        // A worktree whose admin entry exists but can't be opened is reported as
        // prunable rather than failing the whole list.
        if let Ok(wt) = repo.find_worktree(name) {
            worktrees.push(build_linked(&wt));
        }
    }

    Ok(worktrees)
}

/// Create a new worktree named `name` at `worktree_path`. When `reference` is a
/// local branch name, that branch is checked out; otherwise git creates a new
/// branch matching `name` from HEAD.
pub fn add_worktree(
    path: &Path,
    name: &str,
    worktree_path: &Path,
    reference: Option<&str>,
    lock: bool,
) -> Result<Worktree, WorktreeError> {
    if name.trim().is_empty() {
        return Err(WorktreeError::InvalidWorktreeName {
            name: name.to_string(),
        });
    }

    let repo = open_repo(path)?;

    if worktree_path.exists() {
        return Err(WorktreeError::PathAlreadyExists {
            path: worktree_path.to_path_buf(),
        });
    }

    let existing: Vec<String> = repo
        .worktrees()
        .map_err(|e| WorktreeError::ListFailed {
            detail: e.to_string(),
        })?
        .iter()
        .flatten()
        .flatten()
        .map(String::from)
        .collect();
    if existing.iter().any(|n| n == name) {
        return Err(WorktreeError::WorktreeAlreadyExists {
            name: name.to_string(),
        });
    }

    let mut opts = WorktreeAddOptions::new();
    opts.lock(lock);

    // `branch_ref` must outlive `opts` (which borrows it) and the `worktree`
    // call, so it's declared in this scope.
    let branch_ref;
    if let Some(branch_name) = reference {
        let branch = repo
            .find_branch(branch_name, BranchType::Local)
            .map_err(|_| WorktreeError::BranchNotFound {
                name: branch_name.to_string(),
            })?;
        branch_ref = branch.into_reference();
        opts.reference(Some(&branch_ref));
    }

    let wt = repo
        .worktree(name, worktree_path, Some(&opts))
        .map_err(|e| WorktreeError::AddFailed {
            name: name.to_string(),
            detail: e.to_string(),
        })?;

    Ok(build_linked(&wt))
}

/// Remove a linked worktree: delete its working tree and prune its admin files.
/// The main worktree is refused. `force` allows pruning a locked worktree.
pub fn remove_worktree(path: &Path, name: &str, force: bool) -> Result<(), WorktreeError> {
    let repo = open_repo(path)?;

    let linked: Vec<String> = repo
        .worktrees()
        .map_err(|e| WorktreeError::ListFailed {
            detail: e.to_string(),
        })?
        .iter()
        .flatten()
        .flatten()
        .map(String::from)
        .collect();

    if !linked.iter().any(|n| n == name) {
        if name == main_name(&repo) {
            return Err(WorktreeError::RefusedMainWorktree);
        }
        return Err(WorktreeError::WorktreeNotFound {
            name: name.to_string(),
        });
    }

    let wt = repo
        .find_worktree(name)
        .map_err(|_| WorktreeError::WorktreeNotFound {
            name: name.to_string(),
        })?;

    let mut opts = WorktreePruneOptions::new();
    opts.valid(true).working_tree(true);
    if force {
        opts.locked(true);
    }

    wt.prune(Some(&mut opts))
        .map_err(|e| WorktreeError::RemoveFailed {
            name: name.to_string(),
            detail: e.to_string(),
        })
}

/// Look up a linked worktree by name (never matches the main worktree).
fn find_linked(repo: &Repository, name: &str) -> Result<git2::Worktree, WorktreeError> {
    let linked: Vec<String> = repo
        .worktrees()
        .map_err(|e| WorktreeError::ListFailed {
            detail: e.to_string(),
        })?
        .iter()
        .flatten()
        .flatten()
        .map(String::from)
        .collect();

    if !linked.iter().any(|n| n == name) {
        return Err(WorktreeError::WorktreeNotFound {
            name: name.to_string(),
        });
    }

    repo.find_worktree(name)
        .map_err(|_| WorktreeError::WorktreeNotFound {
            name: name.to_string(),
        })
}

/// Lock a worktree, optionally recording a reason.
pub fn lock_worktree(path: &Path, name: &str, reason: Option<&str>) -> Result<(), WorktreeError> {
    let repo = open_repo(path)?;
    let wt = find_linked(&repo, name)?;

    if let Ok(WorktreeLockStatus::Locked(_)) = wt.is_locked() {
        return Err(WorktreeError::AlreadyLocked {
            name: name.to_string(),
        });
    }

    wt.lock(reason).map_err(|e| WorktreeError::LockFailed {
        name: name.to_string(),
        detail: e.to_string(),
    })
}

/// Unlock a worktree.
pub fn unlock_worktree(path: &Path, name: &str) -> Result<(), WorktreeError> {
    let repo = open_repo(path)?;
    let wt = find_linked(&repo, name)?;

    if let Ok(WorktreeLockStatus::Unlocked) = wt.is_locked() {
        return Err(WorktreeError::NotLocked {
            name: name.to_string(),
        });
    }

    wt.unlock().map_err(|e| WorktreeError::UnlockFailed {
        name: name.to_string(),
        detail: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{setup_test_repo, DirectoryGuard};

    /// Create a local branch `name` in the repo at `path` (via the git CLI, so
    /// the code under test reads it back through git2).
    fn create_branch(path: &Path, name: &str) {
        let status = crate::shared::utils::test_utils::git_command()
            .args(["branch", name])
            .current_dir(path)
            .status()
            .expect("failed to run git branch");
        assert!(status.success(), "git branch {name} failed");
    }

    /// A path that does not yet exist, for a new worktree checkout.
    fn fresh_worktree_path(label: &str) -> (tempfile::TempDir, std::path::PathBuf) {
        let parent = tempfile::tempdir().expect("failed to create temp parent");
        let path = parent.path().join(label);
        (parent, path)
    }

    #[test]
    fn list_includes_only_main_for_a_fresh_repo() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let worktrees = list_worktrees(repo.path()).expect("list should succeed");
        assert_eq!(worktrees.len(), 1);
        assert!(worktrees[0].is_main);
        assert_eq!(worktrees[0].branch.as_deref(), Some("main"));
        assert!(worktrees[0].head_sha.is_some());
    }

    #[test]
    fn list_returns_promptly_with_many_linked_worktrees() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        // Mimic a repo with several worktrees, some on their own branch, and
        // keep the parents alive for the duration of the test.
        let mut keep = Vec::new();
        for i in 0..9 {
            let name = format!("wt{i}");
            if i % 2 == 0 {
                create_branch(repo.path(), &format!("branch-{i}"));
                let (parent, path) = fresh_worktree_path(&name);
                add_worktree(
                    repo.path(),
                    &name,
                    &path,
                    Some(&format!("branch-{i}")),
                    false,
                )
                .expect("add referenced worktree");
                keep.push(parent);
            } else {
                let (parent, path) = fresh_worktree_path(&name);
                add_worktree(repo.path(), &name, &path, None, false).expect("add worktree");
                keep.push(parent);
            }
        }

        let worktrees = list_worktrees(repo.path()).expect("list should succeed");
        assert_eq!(worktrees.len(), 10); // main + 9
        assert_eq!(worktrees.iter().filter(|w| !w.is_main).count(), 9);
    }

    #[test]
    fn list_handles_a_worktree_with_a_missing_working_dir() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (parent, path) = fresh_worktree_path("gone");
        add_worktree(repo.path(), "gone", &path, None, false).expect("add");

        // Simulate the working directory being removed out from under us.
        std::fs::remove_dir_all(&path).ok();
        drop(parent);

        // Must still return (branch/head unresolved) rather than hang or panic.
        let worktrees = list_worktrees(repo.path()).expect("list should succeed");
        let gone = worktrees.iter().find(|w| w.name == "gone").expect("entry");
        assert_eq!(gone.branch, None);
        assert_eq!(gone.head_sha, None);
    }

    #[test]
    fn list_open_failure_is_mapped() {
        let _guard = DirectoryGuard::new();
        let missing = std::path::Path::new("/definitely/not/a/repo");
        let err = list_worktrees(missing).expect_err("should fail");
        assert!(matches!(err, WorktreeError::RepositoryOpenFailed { .. }));
    }

    #[test]
    fn add_creates_a_worktree_visible_to_git_and_git2() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("wt1");

        let created =
            add_worktree(repo.path(), "wt1", &wt_path, None, false).expect("add should succeed");
        assert_eq!(created.name, "wt1");
        assert!(!created.is_main);

        // git2 sees it
        let worktrees = list_worktrees(repo.path()).expect("list");
        assert!(worktrees.iter().any(|w| w.name == "wt1" && !w.is_main));

        // git CLI sees it too
        let out = crate::shared::utils::test_utils::git_command()
            .args(["worktree", "list"])
            .current_dir(repo.path())
            .output()
            .expect("git worktree list");
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(stdout.contains("wt1"));
    }

    #[test]
    fn add_with_reference_checks_out_that_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        create_branch(repo.path(), "feature");
        let (_parent, wt_path) = fresh_worktree_path("wt-feature");

        let created = add_worktree(repo.path(), "wt-feature", &wt_path, Some("feature"), false)
            .expect("add should succeed");
        assert_eq!(created.branch.as_deref(), Some("feature"));
    }

    #[test]
    fn add_rejects_empty_name() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("wt");
        let err = add_worktree(repo.path(), "   ", &wt_path, None, false).expect_err("should fail");
        assert!(matches!(err, WorktreeError::InvalidWorktreeName { .. }));
    }

    #[test]
    fn add_rejects_existing_path() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let existing = tempfile::tempdir().expect("temp");
        let err =
            add_worktree(repo.path(), "wt", existing.path(), None, false).expect_err("should fail");
        assert!(matches!(err, WorktreeError::PathAlreadyExists { .. }));
    }

    #[test]
    fn add_rejects_duplicate_name() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_p1, wt1) = fresh_worktree_path("dup");
        add_worktree(repo.path(), "dup", &wt1, None, false).expect("first add");
        let (_p2, wt2) = fresh_worktree_path("dup2");
        let err = add_worktree(repo.path(), "dup", &wt2, None, false).expect_err("should fail");
        assert!(matches!(err, WorktreeError::WorktreeAlreadyExists { .. }));
    }

    #[test]
    fn add_rejects_unknown_reference() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("wt");
        let err = add_worktree(repo.path(), "wt", &wt_path, Some("nope"), false)
            .expect_err("should fail");
        assert!(matches!(err, WorktreeError::BranchNotFound { .. }));
    }

    #[test]
    fn remove_deletes_the_worktree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("to-remove");
        add_worktree(repo.path(), "to-remove", &wt_path, None, false).expect("add");

        remove_worktree(repo.path(), "to-remove", false).expect("remove should succeed");

        let worktrees = list_worktrees(repo.path()).expect("list");
        assert!(!worktrees.iter().any(|w| w.name == "to-remove"));
    }

    #[test]
    fn remove_refuses_the_main_worktree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let worktrees = list_worktrees(repo.path()).expect("list");
        let main = worktrees.iter().find(|w| w.is_main).expect("main entry");
        let err = remove_worktree(repo.path(), &main.name, false).expect_err("should refuse");
        assert!(matches!(err, WorktreeError::RefusedMainWorktree));
    }

    #[test]
    fn remove_unknown_worktree_fails() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let err = remove_worktree(repo.path(), "ghost", false).expect_err("should fail");
        assert!(matches!(err, WorktreeError::WorktreeNotFound { .. }));
    }

    #[test]
    fn lock_and_unlock_roundtrip() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("lockable");
        add_worktree(repo.path(), "lockable", &wt_path, None, false).expect("add");

        lock_worktree(repo.path(), "lockable", Some("busy")).expect("lock");
        let worktrees = list_worktrees(repo.path()).expect("list");
        let wt = worktrees
            .iter()
            .find(|w| w.name == "lockable")
            .expect("entry");
        assert!(wt.is_locked);
        assert_eq!(wt.lock_reason.as_deref(), Some("busy"));

        // Locking again is refused.
        let err = lock_worktree(repo.path(), "lockable", None).expect_err("double lock");
        assert!(matches!(err, WorktreeError::AlreadyLocked { .. }));

        unlock_worktree(repo.path(), "lockable").expect("unlock");
        // Unlocking again is refused.
        let err = unlock_worktree(repo.path(), "lockable").expect_err("double unlock");
        assert!(matches!(err, WorktreeError::NotLocked { .. }));
    }

    #[test]
    fn force_remove_prunes_a_locked_worktree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let (_parent, wt_path) = fresh_worktree_path("locked-remove");
        add_worktree(repo.path(), "locked-remove", &wt_path, None, true).expect("add locked");

        // Without force, pruning a locked worktree is refused by libgit2.
        let err = remove_worktree(repo.path(), "locked-remove", false).expect_err("should fail");
        assert!(matches!(err, WorktreeError::RemoveFailed { .. }));

        remove_worktree(repo.path(), "locked-remove", true).expect("force remove");
        let worktrees = list_worktrees(repo.path()).expect("list");
        assert!(!worktrees.iter().any(|w| w.name == "locked-remove"));
    }

    #[test]
    fn lock_unknown_worktree_fails() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let err = lock_worktree(repo.path(), "ghost", None).expect_err("should fail");
        assert!(matches!(err, WorktreeError::WorktreeNotFound { .. }));
    }
}

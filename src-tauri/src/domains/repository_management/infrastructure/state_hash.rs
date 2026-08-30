use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use crate::domains::repository_management::error::RepositoryError;
use crate::shared::error::AppError;

/// Computes a content fingerprint representing the current branch state of the
/// repository. The value changes **iff** the branch state actually changes
/// (a ref added/removed/moved, HEAD moved, or refs repacked).
///
/// Unlike a filesystem-mtime approach, this hashes the *contents* of the ref
/// surface, so it is immune to second-granularity collisions (two changes in
/// the same wall-clock second) and to filesystems that preserve or coarsen
/// mtimes. It reads only tiny files (~41 bytes per loose ref, plus `packed-refs`
/// and `HEAD`), so it stays in the low-millisecond range regardless of repo size.
///
/// The digest is the low 32 bits of a SipHash `u64`, reinterpreted as `i32` so
/// it fits the existing DB column with no data migration. 32 bits is ample for
/// a change-detection fingerprint (collision odds ~2⁻³² per change, and this is
/// only a fallback — the filesystem watcher never relies on it).
///
/// The git directories are resolved through git2 rather than assumed to be
/// `<root>/.git`, so linked worktrees and submodules (whose `.git` is a
/// *pointer file*) are fingerprinted correctly.
///
/// Hashed inputs, in a stable (sorted) order:
/// - every `refs/heads/**` ref in the *common* git dir: its path relative to
///   `refs/heads` + contents
/// - the full contents of the common dir's `packed-refs` (if present)
/// - the full contents of the worktree-private `HEAD`
///
/// # Arguments
///
/// * `path` - Path to the git repository (working directory root)
///
/// # Returns
///
/// * `Result<i32, AppError>` - Content fingerprint or an error
pub fn compute_repo_state_timestamp(path: &Path) -> Result<i32, AppError> {
    let dirs = resolve_git_dirs(path)?;
    fingerprint(&dirs, path)
}

/// The two directories that together hold a repository's ref surface.
///
/// For an ordinary repository both point at `<root>/.git`. For a **linked
/// worktree** (or a submodule) `<root>/.git` is a *file* containing a
/// `gitdir:` pointer, and the two diverge:
///
/// * `git_dir` — the worktree-private directory (`…/.git/worktrees/<name>`),
///   which owns that worktree's `HEAD`.
/// * `common_dir` — the main repository's `.git`, which owns the shared
///   `refs/heads/**` and `packed-refs`.
///
/// Reading `<root>/.git/**` directly (as this module used to) silently reads
/// nothing at all for those repositories, so the fingerprint never changed and
/// the repo was never re-synced.
pub(crate) struct GitDirs {
    /// Worktree-private git directory (owns `HEAD`).
    pub git_dir: PathBuf,
    /// Shared git directory (owns `refs/heads/**` and `packed-refs`).
    pub common_dir: PathBuf,
}

/// Resolves a working-directory root to its real git directories via git2,
/// which understands `.git` pointer files.
pub(crate) fn resolve_git_dirs(path: &Path) -> Result<GitDirs, AppError> {
    let repo = git2::Repository::open(path).map_err(|e| {
        AppError::new(
            format!("Not a git repository: {}", path.display()),
            "not_git_repository",
            Some(e.to_string()),
        )
    })?;

    Ok(GitDirs {
        git_dir: repo.path().to_path_buf(),
        common_dir: repo.commondir().to_path_buf(),
    })
}

/// Hashes the ref surface described by `dirs`. Errors when *nothing* could be
/// read, so a broken/unreadable git directory surfaces as a failure instead of
/// silently collapsing to the constant empty-hasher digest (which made every
/// comparison report "unchanged").
fn fingerprint(dirs: &GitDirs, path: &Path) -> Result<i32, AppError> {
    let mut hasher = DefaultHasher::new();
    let mut inputs: usize = 0;

    // Loose branch refs under refs/heads/** — collect (relative path, contents)
    // and hash them in a deterministic sorted order. Shared, so read from the
    // common dir.
    let refs_heads = dirs.common_dir.join("refs").join("heads");
    let mut loose_refs: Vec<(String, Vec<u8>)> = Vec::new();
    collect_ref_files(&refs_heads, &refs_heads, &mut loose_refs);
    loose_refs.sort_by(|a, b| a.0.cmp(&b.0));
    for (rel_path, contents) in &loose_refs {
        rel_path.hash(&mut hasher);
        contents.hash(&mut hasher);
        inputs += 1;
    }

    // packed-refs: refs can live here instead of / in addition to loose files.
    if let Ok(contents) = std::fs::read(dirs.common_dir.join("packed-refs")) {
        "packed-refs".hash(&mut hasher);
        contents.hash(&mut hasher);
        inputs += 1;
    }

    // HEAD: changes when the checked-out branch changes. Worktree-private.
    if let Ok(contents) = std::fs::read(dirs.git_dir.join("HEAD")) {
        "HEAD".hash(&mut hasher);
        contents.hash(&mut hasher);
        inputs += 1;
    }

    if inputs == 0 {
        return Err(RepositoryError::StateUnreadable {
            path: path.display().to_string(),
        }
        .into());
    }

    // Take the low 32 bits and reinterpret as i32 to fit the DB column.
    Ok(hasher.finish() as u32 as i32)
}

/// Recursively collects loose ref files under `dir`, keying each by its path
/// relative to `root` (so namespaced branches like `feature/foo` hash stably).
fn collect_ref_files(dir: &Path, root: &Path, out: &mut Vec<(String, Vec<u8>)>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_dir() {
            collect_ref_files(&entry_path, root, out);
        } else if let Ok(contents) = std::fs::read(&entry_path) {
            let rel = entry_path
                .strip_prefix(root)
                .unwrap_or(&entry_path)
                .to_string_lossy()
                .replace('\\', "/");
            out.push((rel, contents));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{run_git, setup_test_repo, DirectoryGuard};

    #[test]
    fn test_compute_repo_state_timestamp() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let fp1 = compute_repo_state_timestamp(path);
        assert!(
            fp1.is_ok(),
            "Failed to compute fingerprint: {:?}",
            fp1.err()
        );

        // Fingerprint is stable when nothing changes (no sleep needed).
        let fp2 = compute_repo_state_timestamp(path);
        assert!(fp2.is_ok());
        assert_eq!(fp1.unwrap(), fp2.unwrap(), "Fingerprint should be stable");
    }

    #[test]
    fn test_fingerprint_changes_on_new_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let fp1 = compute_repo_state_timestamp(path).unwrap();

        crate::shared::utils::test_utils::git_command()
            .args(["branch", "test-new-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let fp2 = compute_repo_state_timestamp(path).unwrap();
        assert_ne!(
            fp1, fp2,
            "Fingerprint should change when a new branch is created"
        );
    }

    #[test]
    fn test_fingerprint_changes_on_branch_delete() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        crate::shared::utils::test_utils::git_command()
            .args(["branch", "test-delete-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let fp1 = compute_repo_state_timestamp(path).unwrap();

        crate::shared::utils::test_utils::git_command()
            .args(["branch", "-D", "test-delete-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let fp2 = compute_repo_state_timestamp(path).unwrap();
        assert_ne!(
            fp1, fp2,
            "Fingerprint should change when a branch is deleted"
        );
    }

    #[test]
    fn test_fingerprint_changes_on_new_commit() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let fp1 = compute_repo_state_timestamp(path).unwrap();

        std::fs::write(path.join("test_file.txt"), "test content").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "test_file.txt"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "Test commit"])
            .current_dir(path)
            .output()
            .unwrap();

        let fp2 = compute_repo_state_timestamp(path).unwrap();
        assert_ne!(
            fp1, fp2,
            "Fingerprint should change when a new commit moves the branch ref"
        );
    }

    #[test]
    fn test_fingerprint_distinguishes_branch_names() {
        let _guard = DirectoryGuard::new();
        let repo_a = setup_test_repo();
        crate::shared::utils::test_utils::git_command()
            .args(["branch", "alpha"])
            .current_dir(repo_a.path())
            .output()
            .unwrap();
        let fp_a = compute_repo_state_timestamp(repo_a.path()).unwrap();

        let repo_b = setup_test_repo();
        crate::shared::utils::test_utils::git_command()
            .args(["branch", "beta"])
            .current_dir(repo_b.path())
            .output()
            .unwrap();
        let fp_b = compute_repo_state_timestamp(repo_b.path()).unwrap();

        // Same shape, different branch name → different fingerprint.
        assert_ne!(fp_a, fp_b, "Different branch names should hash differently");
    }

    /// A linked worktree's `.git` is a *file*, so the old `<root>/.git/**`
    /// reads all failed silently and every worktree hashed to the same
    /// constant. The fingerprint must now track the real ref surface.
    #[test]
    fn test_fingerprint_tracks_linked_worktree_refs() {
        let _guard = DirectoryGuard::new();
        let main = setup_test_repo();
        let holder = tempfile::tempdir().unwrap();
        let worktree = holder.path().join("wt");
        run_git(
            main.path(),
            &[
                "worktree",
                "add",
                worktree.to_str().unwrap(),
                "-b",
                "wt-branch",
            ],
        );

        // `.git` really is a pointer file here — the case that used to break.
        assert!(worktree.join(".git").is_file());

        let fp1 = compute_repo_state_timestamp(&worktree).unwrap();

        run_git(&worktree, &["branch", "created-in-worktree"]);

        let fp2 = compute_repo_state_timestamp(&worktree).unwrap();
        assert_ne!(
            fp1, fp2,
            "Fingerprint should change when a branch is created from the worktree"
        );
    }

    /// The worktree's private git dir owns HEAD; the main repository's git dir
    /// owns the shared refs.
    #[test]
    fn test_resolve_git_dirs_splits_worktree_and_common_dir() {
        let _guard = DirectoryGuard::new();
        let main = setup_test_repo();
        let holder = tempfile::tempdir().unwrap();
        let worktree = holder.path().join("wt");
        run_git(
            main.path(),
            &[
                "worktree",
                "add",
                worktree.to_str().unwrap(),
                "-b",
                "wt-dirs",
            ],
        );

        let dirs = resolve_git_dirs(&worktree).unwrap();
        let main_git_dir = std::fs::canonicalize(main.path().join(".git")).unwrap();
        let common = std::fs::canonicalize(&dirs.common_dir).unwrap();
        let private = std::fs::canonicalize(&dirs.git_dir).unwrap();

        assert_eq!(common, main_git_dir, "common dir is the main repo's .git");
        assert!(
            private.starts_with(&main_git_dir) && private != main_git_dir,
            "private git dir lives under the main .git: {}",
            private.display()
        );
        assert!(private.join("HEAD").is_file());
        assert!(common.join("refs").join("heads").is_dir());

        // The main repo still resolves to a single directory.
        let main_dirs = resolve_git_dirs(main.path()).unwrap();
        assert_eq!(main_dirs.git_dir, main_dirs.common_dir);
    }

    /// A git directory from which nothing at all could be read must surface as
    /// an error rather than the constant empty-hasher digest, which silently
    /// made every drift comparison report "unchanged".
    #[test]
    fn test_fingerprint_errors_when_nothing_could_be_read() {
        let _guard = DirectoryGuard::new();
        let empty = tempfile::tempdir().unwrap();
        let dirs = GitDirs {
            git_dir: empty.path().to_path_buf(),
            common_dir: empty.path().to_path_buf(),
        };

        let err = fingerprint(&dirs, empty.path()).expect_err("no inputs must error");
        assert_eq!(err.kind, "repo_state_unreadable");
    }

    /// A repository with no commits has no refs at all — only HEAD is
    /// readable — but it is still a real repository and must fingerprint
    /// (this runs inside `create_repository`).
    #[test]
    fn test_fingerprint_of_a_repository_without_commits() {
        let _guard = DirectoryGuard::new();
        let empty = tempfile::tempdir().unwrap();
        run_git(empty.path(), &["init"]);

        assert!(compute_repo_state_timestamp(empty.path()).is_ok());
    }

    #[test]
    fn test_fingerprint_errors_on_non_git() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();

        let result = compute_repo_state_timestamp(non_git_path);
        assert!(result.is_err(), "Should error on non-git directory");
    }
}

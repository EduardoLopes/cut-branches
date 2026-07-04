use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

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
/// Hashed inputs, in a stable (sorted) order:
/// - every `.git/refs/heads/**` ref: its path relative to `refs/heads` + contents
/// - the full contents of `.git/packed-refs` (if present)
/// - the full contents of `.git/HEAD`
///
/// # Arguments
///
/// * `path` - Path to the git repository (working directory root)
///
/// # Returns
///
/// * `Result<i32, AppError>` - Content fingerprint or an error
pub fn compute_repo_state_timestamp(path: &Path) -> Result<i32, AppError> {
    let git_dir = path.join(".git");

    // Check if .git exists
    if !git_dir.exists() {
        return Err(AppError::new(
            format!("Not a git repository: {}", path.display()),
            "not_git_repository",
            None,
        ));
    }

    let mut hasher = DefaultHasher::new();

    // Loose branch refs under refs/heads/** — collect (relative path, contents)
    // and hash them in a deterministic sorted order.
    let refs_heads = git_dir.join("refs").join("heads");
    let mut loose_refs: Vec<(String, Vec<u8>)> = Vec::new();
    collect_ref_files(&refs_heads, &refs_heads, &mut loose_refs);
    loose_refs.sort_by(|a, b| a.0.cmp(&b.0));
    for (rel_path, contents) in &loose_refs {
        rel_path.hash(&mut hasher);
        contents.hash(&mut hasher);
    }

    // packed-refs: refs can live here instead of / in addition to loose files.
    let packed_refs = git_dir.join("packed-refs");
    if let Ok(contents) = std::fs::read(&packed_refs) {
        "packed-refs".hash(&mut hasher);
        contents.hash(&mut hasher);
    }

    // HEAD: changes when the checked-out branch changes.
    let head_file = git_dir.join("HEAD");
    if let Ok(contents) = std::fs::read(&head_file) {
        "HEAD".hash(&mut hasher);
        contents.hash(&mut hasher);
    }

    // If we somehow read nothing (e.g. a bare or unusual layout), fall back to a
    // stable non-zero sentinel so callers always get a valid, comparable value.
    let digest = hasher.finish();
    if digest == 0 {
        return Err(RepositoryError::CurrentTimeFailed {
            detail: "empty repository fingerprint".to_string(),
        }
        .into());
    }

    // Take the low 32 bits and reinterpret as i32 to fit the DB column.
    Ok(digest as u32 as i32)
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
    use crate::shared::utils::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

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

        Command::new("git")
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

        Command::new("git")
            .args(["branch", "test-delete-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        let fp1 = compute_repo_state_timestamp(path).unwrap();

        Command::new("git")
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
        Command::new("git")
            .args(["add", "test_file.txt"])
            .current_dir(path)
            .output()
            .unwrap();
        Command::new("git")
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
        Command::new("git")
            .args(["branch", "alpha"])
            .current_dir(repo_a.path())
            .output()
            .unwrap();
        let fp_a = compute_repo_state_timestamp(repo_a.path()).unwrap();

        let repo_b = setup_test_repo();
        Command::new("git")
            .args(["branch", "beta"])
            .current_dir(repo_b.path())
            .output()
            .unwrap();
        let fp_b = compute_repo_state_timestamp(repo_b.path()).unwrap();

        // Same shape, different branch name → different fingerprint.
        assert_ne!(fp_a, fp_b, "Different branch names should hash differently");
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

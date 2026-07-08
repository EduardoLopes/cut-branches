//! Directory-size and modification-time measurement (§1.1 infrastructure).

use std::path::Path;
use std::time::UNIX_EPOCH;

use jwalk::WalkDir;

/// Total size in bytes of all regular files under `path`, walked in parallel.
/// Symlinks are not followed and directory entries contribute nothing
/// themselves, so the figure reflects reclaimable file bytes.
pub fn dir_size_bytes(path: &Path) -> u64 {
    WalkDir::new(path)
        .skip_hidden(false)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|meta| meta.len())
        .sum()
}

/// Working-directory modification time as a Unix timestamp (seconds), or `None`
/// if it can't be read. Used alongside the last-commit time to judge staleness.
pub fn dir_mtime(path: &Path) -> Option<i64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let secs = modified.duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some(secs as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn sums_file_sizes_recursively() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join("a.bin"), vec![0u8; 100]).unwrap();
        fs::create_dir_all(root.join("nested")).unwrap();
        fs::write(root.join("nested/b.bin"), vec![0u8; 50]).unwrap();

        assert_eq!(dir_size_bytes(root), 150);
    }

    #[test]
    fn empty_dir_is_zero() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(dir_size_bytes(tmp.path()), 0);
    }

    #[test]
    fn mtime_is_readable_for_existing_dir() {
        let tmp = TempDir::new().unwrap();
        assert!(dir_mtime(tmp.path()).is_some());
    }

    #[test]
    fn mtime_none_for_missing_path() {
        assert!(dir_mtime(Path::new("/no/such/path/xyz123")).is_none());
    }
}

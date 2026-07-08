//! Use-case: find registered repositories that are "stale" and worth cleaning
//! (§1.2). A repository is stale when its most recent activity — the newer of
//! its last git commit and its working-dir modification time — is older than the
//! threshold. Taking the newer of the two is the conservative choice: it avoids
//! calling an actively-edited repo stale just because git has been quiet.

use std::path::Path;

use crate::domains::repository_cleanup::core::models::cleanup_target::CleanupTarget;
use crate::domains::repository_cleanup::core::models::registered_repo::RegisteredRepo;
use crate::domains::repository_cleanup::infrastructure::{git, scanner, sizing};

const SECONDS_PER_DAY: i64 = 86_400;

/// A stale repository and the space its cleanable folders would reclaim.
pub struct StaleRepositoryData {
    pub id: String,
    pub name: String,
    pub path: String,
    /// Unix seconds of the repository's most recent activity.
    pub stale_since: i64,
    pub reclaimable_bytes: u64,
    pub targets: Vec<CleanupTarget>,
}

/// Determine the most-recent-activity timestamp for a repo, or `None` if it
/// can't be established from either git or the filesystem.
pub fn last_activity(last_commit: Option<i64>, mtime: Option<i64>) -> Option<i64> {
    match (last_commit, mtime) {
        (Some(a), Some(b)) => Some(a.max(b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    }
}

/// Whether an activity timestamp is older than `threshold_days` relative to
/// `now_secs`.
pub fn is_stale(activity_secs: i64, now_secs: i64, threshold_days: u32) -> bool {
    now_secs - activity_secs > threshold_days as i64 * SECONDS_PER_DAY
}

/// Scan `repos` for stale repositories that have reclaimable cleanable folders.
/// Discovery is driven by each repo's `.gitignore` stack, matching the
/// per-repository `scan_cleanup_targets` flow.
/// `on_progress(scanned, total, found, current_name)` streams progress, where
/// `found` is the number of stale repositories with reclaimable space so far.
pub fn list_stale_repositories<F>(
    repos: &[RegisteredRepo],
    threshold_days: u32,
    now_secs: i64,
    mut on_progress: F,
) -> Vec<StaleRepositoryData>
where
    F: FnMut(u32, u32, u32, &str),
{
    let total = repos.len() as u32;
    let mut out = Vec::new();

    // Initial tick so the UI shows a determinate bar before the first
    // (potentially slow to size) repository completes.
    on_progress(0, total, 0, "");

    for (index, repo) in repos.iter().enumerate() {
        let path = Path::new(&repo.path);

        // Evaluate the repo; `None` means "skip" (undeterminable activity, not
        // stale, or nothing reclaimable). Sizing the targets is the slow part.
        let data = (|| {
            let activity = last_activity(git::last_commit_time(path), sizing::dir_mtime(path))?;
            if !is_stale(activity, now_secs, threshold_days) {
                return None;
            }

            let targets: Vec<CleanupTarget> = scanner::find_cleanup_targets(path)
                .into_iter()
                .map(|item| {
                    let size_bytes = sizing::dir_size_bytes(&item.path);
                    CleanupTarget {
                        path: item.path.to_string_lossy().into_owned(),
                        folder_name: item.folder_name,
                        size_bytes,
                    }
                })
                .collect();

            if targets.is_empty() {
                return None;
            }

            let reclaimable_bytes = targets.iter().map(|t| t.size_bytes).sum();
            Some(StaleRepositoryData {
                id: repo.id.clone(),
                name: repo.name.clone(),
                path: repo.path.clone(),
                stale_since: activity,
                reclaimable_bytes,
                targets,
            })
        })();

        if let Some(data) = data {
            out.push(data);
        }

        // Report AFTER the repo is fully measured, so the count reflects
        // completed work and reaching `total` coincides with the scan actually
        // finishing — the progress bar no longer sits at 100% during the last
        // repository's sizing.
        on_progress(index as u32 + 1, total, out.len() as u32, &repo.name);
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn last_activity_takes_the_newer() {
        assert_eq!(last_activity(Some(100), Some(200)), Some(200));
        assert_eq!(last_activity(Some(300), Some(200)), Some(300));
        assert_eq!(last_activity(Some(100), None), Some(100));
        assert_eq!(last_activity(None, Some(50)), Some(50));
        assert_eq!(last_activity(None, None), None);
    }

    #[test]
    fn is_stale_respects_threshold() {
        let now = 100 * SECONDS_PER_DAY;
        // Active 10 days ago, threshold 90 → not stale.
        assert!(!is_stale(90 * SECONDS_PER_DAY, now, 90));
        // Active 95 days ago, threshold 90 → stale.
        assert!(is_stale(5 * SECONDS_PER_DAY, now, 90));
    }

    #[test]
    fn exactly_at_threshold_is_not_stale() {
        let now = 90 * SECONDS_PER_DAY;
        // now - activity == threshold exactly → not stale (strictly greater).
        assert!(!is_stale(0, now, 90));
    }

    #[test]
    fn surfaces_gitignored_folders_in_bulk_scan() {
        use std::fs;
        use tempfile::TempDir;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::write(root.join(".gitignore"), "coverage/\n").unwrap();
        fs::create_dir_all(root.join("coverage/tmp")).unwrap();
        fs::create_dir_all(root.join("src")).unwrap();

        let repo = RegisteredRepo {
            id: "r1".to_string(),
            name: "repo".to_string(),
            path: root.to_string_lossy().into_owned(),
        };
        // Far-future `now` guarantees staleness regardless of the temp dir's mtime.
        let out = list_stale_repositories(&[repo], 0, i64::MAX / 2, |_, _, _, _| {});

        assert_eq!(out.len(), 1);
        let targets = &out[0].targets;
        assert_eq!(targets.len(), 1);
        assert_eq!(targets[0].folder_name, "coverage");
    }
}

//! Cached bulk branch metrics.
//!
//! A branch's merge status and diff stats are a pure function of
//! `(HEAD tip sha, branch tip sha)` — immutable content addresses — so results
//! are persisted in `branch_metrics_cache` and survive app restarts. Each call
//! resolves the requested branches' tips (cheap ref lookups), serves what the
//! cache already holds, computes only the misses (parallel, see
//! `infrastructure::git::branch::bulk_get_branch_metrics`) and stores them.
//!
//! The cache is an optimization, never a source of truth: any DB failure
//! degrades to computing everything, logged at `warn`.

use std::collections::HashMap;
use std::path::Path;

use crate::domains::branch_management::infrastructure::git::branch::{
    bulk_get_branch_metrics, resolve_branch_tips, BranchMetricsRecord,
};
use crate::domains::branch_management::infrastructure::repositories::{
    get_branch_metrics_cache_batch, upsert_branch_metrics_cache_batch,
};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::{models::NewBranchMetricsCacheRecord, DbConnection};

/// Bulk metrics with the persistent cache in front of the compute path.
/// Output preserves the order of `branch_names`; branches whose ref no longer
/// resolves are omitted, exactly like the uncached path.
pub fn bulk_get_branch_metrics_cached(
    path: &Path,
    branch_names: &[String],
    conn: &mut DbConnection,
) -> Result<Vec<BranchMetricsRecord>, AppError> {
    let (head_sha, tips) = resolve_branch_tips(path, branch_names)?;

    // Cache read. A failure here is not the caller's problem — fall back to
    // an empty hit set and compute everything.
    let tip_shas: Vec<String> = tips.iter().map(|(_, sha)| sha.clone()).collect();
    let cached_by_sha: HashMap<String, (bool, i32, i32)> =
        match get_branch_metrics_cache_batch(conn, &head_sha, &tip_shas) {
            Ok(rows) => rows
                .into_iter()
                .map(|r| (r.branch_sha, (r.is_merged, r.lines_added, r.lines_removed)))
                .collect(),
            Err(e) => {
                log::warn!("branch metrics cache read failed, computing all: {e}");
                HashMap::new()
            }
        };

    let missing_names: Vec<String> = tips
        .iter()
        .filter(|(_, sha)| !cached_by_sha.contains_key(sha))
        .map(|(name, _)| name.clone())
        .collect();

    let computed = if missing_names.is_empty() {
        Vec::new()
    } else {
        bulk_get_branch_metrics(path, &missing_names)?
    };
    let computed_by_name: HashMap<&str, &BranchMetricsRecord> =
        computed.iter().map(|r| (r.name.as_str(), r)).collect();

    // Persist the fresh rows. Tips are re-read from `tips` so the stored key
    // is the sha the result was requested for; a branch that moved between the
    // resolve and the compute just wastes one cache row, it can't corrupt.
    let new_rows: Vec<NewBranchMetricsCacheRecord> = tips
        .iter()
        .filter_map(|(name, sha)| {
            let record = computed_by_name.get(name.as_str())?;
            Some(NewBranchMetricsCacheRecord {
                head_sha: head_sha.clone(),
                branch_sha: sha.clone(),
                is_merged: record.is_merged,
                lines_added: i32::try_from(record.lines_added).unwrap_or(i32::MAX),
                lines_removed: i32::try_from(record.lines_removed).unwrap_or(i32::MAX),
            })
        })
        .collect();
    if let Err(e) = upsert_branch_metrics_cache_batch(conn, &new_rows) {
        log::warn!("branch metrics cache write failed: {e}");
    }

    // Merge, preserving the resolved-tip order (itself input order).
    let metrics = tips
        .iter()
        .filter_map(|(name, sha)| {
            if let Some((is_merged, added, removed)) = cached_by_sha.get(sha) {
                return Some(BranchMetricsRecord {
                    name: name.clone(),
                    is_merged: *is_merged,
                    lines_added: usize::try_from(*added).unwrap_or(0),
                    lines_removed: usize::try_from(*removed).unwrap_or(0),
                });
            }
            let record = computed_by_name.get(name.as_str())?;
            Some(BranchMetricsRecord {
                name: name.clone(),
                is_merged: record.is_merged,
                lines_added: record.lines_added,
                lines_removed: record.lines_removed,
            })
        })
        .collect();

    Ok(metrics)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::infrastructure::db::MIGRATIONS;
    use crate::shared::utils::test_utils::{setup_test_repo, DirectoryGuard};
    use diesel::prelude::*;
    use diesel::r2d2::{ConnectionManager, Pool};
    use diesel_migrations::MigrationHarness;

    fn test_conn() -> DbConnection {
        let manager = ConnectionManager::<SqliteConnection>::new(":memory:");
        let pool = Pool::builder().max_size(1).build(manager).unwrap();
        let mut conn = pool.get().unwrap();
        conn.run_pending_migrations(MIGRATIONS).unwrap();
        conn
    }

    fn git(path: &Path, args: &[&str]) {
        let out = crate::shared::utils::test_utils::git_command()
            .args(args)
            .current_dir(path)
            .output()
            .unwrap();
        assert!(out.status.success(), "git {args:?} failed");
    }

    fn cache_row_count(conn: &mut DbConnection) -> i64 {
        use crate::shared::infrastructure::db::schema::branch_metrics_cache::dsl::*;
        branch_metrics_cache.count().get_result(conn).unwrap()
    }

    #[test]
    fn test_cold_call_computes_and_persists() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        git(path, &["checkout", "-b", "feature/cached"]);
        std::fs::write(path.join("cached.txt"), "cached\n").unwrap();
        git(path, &["add", "."]);
        git(path, &["commit", "-m", "cached work"]);
        git(path, &["checkout", "main"]);

        let mut conn = test_conn();
        let names = vec!["feature/cached".to_string()];

        let metrics = bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();
        assert_eq!(metrics.len(), 1);
        assert_eq!(metrics[0].name, "feature/cached");
        assert!(!metrics[0].is_merged);
        assert!(metrics[0].lines_added > 0);
        assert_eq!(cache_row_count(&mut conn), 1);
    }

    #[test]
    fn test_warm_call_serves_from_cache() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        git(path, &["checkout", "-b", "feature/warm"]);
        std::fs::write(path.join("warm.txt"), "warm\n").unwrap();
        git(path, &["add", "."]);
        git(path, &["commit", "-m", "warm work"]);
        git(path, &["checkout", "main"]);

        let mut conn = test_conn();
        let names = vec!["feature/warm".to_string()];

        let cold = bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();

        // Poison the cached row: if the second call recomputed instead of
        // reading the cache, it would return the true values, not these.
        {
            use crate::shared::infrastructure::db::schema::branch_metrics_cache::dsl::*;
            diesel::update(branch_metrics_cache)
                .set((lines_added.eq(999), lines_removed.eq(888)))
                .execute(&mut conn)
                .unwrap();
        }

        let warm = bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();
        assert_eq!(warm.len(), 1);
        assert_eq!(warm[0].lines_added, 999, "expected the cached row");
        assert_eq!(warm[0].lines_removed, 888);
        assert_ne!(cold[0].lines_added, 999);
    }

    #[test]
    fn test_head_move_rekeys_the_cache() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        git(path, &["checkout", "-b", "feature/rekey"]);
        std::fs::write(path.join("rekey.txt"), "rekey\n").unwrap();
        git(path, &["add", "."]);
        git(path, &["commit", "-m", "rekey work"]);
        git(path, &["checkout", "main"]);

        let mut conn = test_conn();
        let names = vec!["feature/rekey".to_string()];
        bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();
        assert_eq!(cache_row_count(&mut conn), 1);

        // Move HEAD: the old pair is no longer looked up; a new pair lands.
        std::fs::write(path.join("main.txt"), "main moved\n").unwrap();
        git(path, &["add", "."]);
        git(path, &["commit", "-m", "head moves"]);

        let metrics = bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();
        assert_eq!(metrics.len(), 1);
        assert_eq!(cache_row_count(&mut conn), 2);
    }

    #[test]
    fn test_missing_branch_is_skipped() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let mut conn = test_conn();
        let names = vec!["does-not-exist".to_string()];
        let metrics = bulk_get_branch_metrics_cached(path, &names, &mut conn).unwrap();
        assert!(metrics.is_empty());
        assert_eq!(cache_row_count(&mut conn), 0);
    }

    #[test]
    fn test_preserves_input_order_with_mixed_hits() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        for name in ["feature/a", "feature/b"] {
            git(path, &["checkout", "-b", name]);
            std::fs::write(path.join(format!("{}.txt", name.replace('/', "-"))), "x\n").unwrap();
            git(path, &["add", "."]);
            git(path, &["commit", "-m", name]);
            git(path, &["checkout", "main"]);
        }

        let mut conn = test_conn();
        // Warm only feature/b, then ask for both.
        bulk_get_branch_metrics_cached(path, &["feature/b".to_string()], &mut conn).unwrap();
        let metrics = bulk_get_branch_metrics_cached(
            path,
            &["feature/a".to_string(), "feature/b".to_string()],
            &mut conn,
        )
        .unwrap();
        let names: Vec<&str> = metrics.iter().map(|m| m.name.as_str()).collect();
        assert_eq!(names, vec!["feature/a", "feature/b"]);
    }
}

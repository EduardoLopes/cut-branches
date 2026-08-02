//! Persistence adapters for the `branches` table (this domain's data, guide 1.3).

use crate::shared::infrastructure::db::models::*;
use crate::shared::infrastructure::db::schema::*;
use diesel::prelude::*;
use diesel::result::Error as DieselError;

// Branch operations
pub fn get_branches_for_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
    filters: &crate::domains::branch_management::filters::BranchFilters,
) -> Result<Vec<(BranchRecord, CommitRecord)>, DieselError> {
    use crate::domains::branch_management::filters::*;

    let mut query = branches::table
        .inner_join(commits::table)
        .select((BranchRecord::as_select(), CommitRecord::as_select()))
        .filter(branches::repository_id.eq(repo_id))
        .into_boxed();

    // Apply deletion status filter
    match filters.deletion_status {
        DeletionStatusFilter::Active => {
            query = query.filter(branches::deleted_at.is_null());
        }
        DeletionStatusFilter::Deleted => {
            query = query.filter(branches::deleted_at.is_not_null());
        }
        DeletionStatusFilter::All => {
            // No filter needed for deletion status
        }
    }

    // Apply merge status filter
    match filters.merge_status {
        MergeStatusFilter::Merged => {
            query = query.filter(branches::fully_merged.eq(true));
        }
        MergeStatusFilter::Unmerged => {
            query = query.filter(branches::fully_merged.eq(false));
        }
        MergeStatusFilter::All => {
            // No filter needed for merge status
        }
    }

    // Apply selection status filter
    match filters.selection_status {
        SelectionStatusFilter::Selected => {
            query = query.filter(branches::is_selected.eq(true));
        }
        SelectionStatusFilter::Unselected => {
            query = query.filter(branches::is_selected.eq(false));
        }
        SelectionStatusFilter::All => {
            // No filter needed for selection status
        }
    }

    // Apply lock status filter
    match filters.lock_status {
        LockStatusFilter::Locked => {
            query = query.filter(branches::is_locked.eq(true));
        }
        LockStatusFilter::Unlocked => {
            query = query.filter(branches::is_locked.eq(false));
        }
        LockStatusFilter::All => {
            // No filter needed for lock status
        }
    }

    // Apply current branch filter
    if !filters.include_current {
        query = query.filter(branches::current.eq(false));
    }

    // Order by name for active branches, by deleted_at for deleted branches
    match filters.deletion_status {
        DeletionStatusFilter::Deleted => query.order(branches::deleted_at.desc()).load(conn),
        _ => query.order(branches::name.asc()).load(conn),
    }
}

/// Batch upsert branches for better performance when syncing many branches
pub fn upsert_branches_batch(
    conn: &mut SqliteConnection,
    branches: &[NewBranchRecord],
) -> Result<usize, DieselError> {
    if branches.is_empty() {
        return Ok(0);
    }

    // SQLite doesn't support true batch upserts with ON CONFLICT in Diesel
    // But we can optimize by processing in a tight loop without individual error handling
    // This is still much faster than the previous version with error handling overhead
    let mut total_inserted = 0;

    for branch in branches {
        diesel::insert_into(branches::table)
            .values(branch)
            .on_conflict((branches::repository_id, branches::name))
            .do_update()
            .set((
                branches::current.eq(&branch.current),
                branches::fully_merged.eq(&branch.fully_merged),
                branches::head_commit_sha.eq(&branch.head_commit_sha),
                branches::upstream.eq(&branch.upstream),
                branches::is_reachable.eq(&branch.is_reachable),
                // Note: is_selected, is_locked, and deleted_at are intentionally excluded
                // to preserve user-managed state during sync operations
            ))
            .execute(conn)?;
        total_inserted += 1;
    }

    Ok(total_inserted)
}

/// Insert tip-commit rows, ignoring SHAs already stored (commit content is
/// immutable, so an existing row never needs updating).
pub fn upsert_commits_batch(
    conn: &mut SqliteConnection,
    records: &[NewCommitRecord],
) -> Result<usize, DieselError> {
    if records.is_empty() {
        return Ok(0);
    }

    // SQLite can't batch multi-row VALUES with ON CONFLICT through Diesel;
    // insert row by row like `upsert_branches_batch` does.
    let mut total_inserted = 0;
    for record in records {
        total_inserted += diesel::insert_into(commits::table)
            .values(record)
            .on_conflict(commits::sha)
            .do_nothing()
            .execute(conn)?;
    }

    Ok(total_inserted)
}

/// Delete commit rows no longer referenced by any branch (active or
/// soft-deleted, across all repositories). Rows referenced by soft-deleted
/// branches survive, which is the point of storing commits at all.
pub fn delete_orphan_commits(conn: &mut SqliteConnection) -> Result<usize, DieselError> {
    diesel::delete(
        commits::table
            .filter(commits::sha.ne_all(branches::table.select(branches::head_commit_sha))),
    )
    .execute(conn)
}

pub fn mark_branches_deleted(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: &[String],
) -> Result<usize, DieselError> {
    use chrono::Utc;
    let now = Utc::now().to_rfc3339();

    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq_any(branch_names)),
    )
    .set((
        branches::deleted_at.eq(Some(now)),
        branches::is_selected.eq(false),
    ))
    .execute(conn)
}

pub fn mark_branches_as_active(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: &[String],
) -> Result<usize, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq_any(branch_names)),
    )
    .set((
        branches::deleted_at.eq(None::<String>),
        branches::is_selected.eq(false),
    ))
    .execute(conn)
}

// Selected branches operations
pub fn update_branch_selection_batch(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
    is_selected: bool,
) -> Result<usize, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq_any(branch_names)),
    )
    .set(branches::is_selected.eq(is_selected))
    .execute(conn)
}

pub fn get_branch_selection_list(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<String>, DieselError> {
    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::is_selected.eq(true))
        .filter(branches::deleted_at.is_null())
        .select(branches::name)
        .load::<String>(conn)
}

pub fn get_deleted_branch_selection_list(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<String>, DieselError> {
    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::is_selected.eq(true))
        .filter(branches::deleted_at.is_not_null())
        .select(branches::name)
        .load::<String>(conn)
}

pub fn set_branch_selection_all(
    conn: &mut SqliteConnection,
    repo_id: &str,
    is_selected: bool,
    deletion_status: crate::domains::branch_management::filters::DeletionStatusFilter,
    exclude_locked: bool,
    exclude_current: bool,
) -> Result<usize, DieselError> {
    use crate::domains::branch_management::filters::DeletionStatusFilter;

    // Build base query filters
    let base_filters = (
        branches::repository_id.eq(repo_id),
        branches::is_selected.eq(!is_selected),
    );

    match (deletion_status, exclude_locked, exclude_current) {
        // Active branches
        (DeletionStatusFilter::Active, false, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_null()),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Active, true, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_null())
                .filter(branches::is_locked.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Active, false, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_null())
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Active, true, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_null())
                .filter(branches::is_locked.eq(false))
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),

        // Deleted branches
        (DeletionStatusFilter::Deleted, false, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_not_null()),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Deleted, true, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_not_null())
                .filter(branches::is_locked.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Deleted, false, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_not_null())
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::Deleted, true, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::deleted_at.is_not_null())
                .filter(branches::is_locked.eq(false))
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),

        // All branches
        (DeletionStatusFilter::All, false, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::All, true, false) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::is_locked.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::All, false, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
        (DeletionStatusFilter::All, true, true) => diesel::update(
            branches::table
                .filter(base_filters.0)
                .filter(base_filters.1)
                .filter(branches::is_locked.eq(false))
                .filter(branches::current.eq(false)),
        )
        .set(branches::is_selected.eq(is_selected))
        .execute(conn),
    }
}

// Locked branches operations
pub fn add_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<usize, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq_any(branch_names)),
    )
    .set(branches::is_locked.eq(true))
    .execute(conn)
}

pub fn get_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<String>, DieselError> {
    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::is_locked.eq(true))
        .select(branches::name)
        .load::<String>(conn)
}

pub fn remove_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<usize, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq_any(branch_names)),
    )
    .set(branches::is_locked.eq(false))
    .execute(conn)
}

// Branch metrics cache operations. The cache is keyed by
// (HEAD tip sha, branch tip sha); within one lookup batch the HEAD sha is a
// single constant, so the tuple key collapses to an indexed equality filter
// plus an IN() over the branch tips.

/// Cached metrics rows for a batch of branch tips under one HEAD.
pub fn get_branch_metrics_cache_batch(
    conn: &mut SqliteConnection,
    head: &str,
    branch_shas: &[String],
) -> Result<Vec<BranchMetricsCacheRecord>, DieselError> {
    branch_metrics_cache::table
        .filter(branch_metrics_cache::head_sha.eq(head))
        .filter(branch_metrics_cache::branch_sha.eq_any(branch_shas))
        .select(BranchMetricsCacheRecord::as_select())
        .load(conn)
}

/// Upserts freshly computed metrics rows. `INSERT OR REPLACE` semantics: a
/// recomputed pair simply refreshes `computed_at`.
pub fn upsert_branch_metrics_cache_batch(
    conn: &mut SqliteConnection,
    records: &[NewBranchMetricsCacheRecord],
) -> Result<usize, DieselError> {
    if records.is_empty() {
        return Ok(0);
    }
    diesel::replace_into(branch_metrics_cache::table)
        .values(records)
        .execute(conn)
}

/// Retention window for cache rows. A busy repository re-keys the whole cache
/// on every commit to HEAD, so old rows are dead weight; 30 days comfortably
/// covers "came back to a branch after a while" without unbounded growth.
pub const BRANCH_METRICS_CACHE_MAX_AGE_DAYS: i64 = 30;
/// Hard row cap as a backstop against pathological churn (monorepos with
/// constant HEAD movement). Oldest rows go first.
pub const BRANCH_METRICS_CACHE_MAX_ROWS: i64 = 50_000;

/// Prunes the metrics cache by age, then by the row cap. Pruning is purely an
/// optimization concern — a pruned pair just recomputes on next sight.
pub fn prune_branch_metrics_cache(conn: &mut SqliteConnection) -> Result<usize, DieselError> {
    use chrono::{Duration, Utc};

    let cutoff = Utc::now().naive_utc() - Duration::days(BRANCH_METRICS_CACHE_MAX_AGE_DAYS);
    let mut deleted = diesel::delete(
        branch_metrics_cache::table.filter(branch_metrics_cache::computed_at.lt(cutoff)),
    )
    .execute(conn)?;

    let count: i64 = branch_metrics_cache::table.count().get_result(conn)?;
    if count > BRANCH_METRICS_CACHE_MAX_ROWS {
        let excess = count - BRANCH_METRICS_CACHE_MAX_ROWS;
        // SQLite can't ORDER BY/LIMIT inside DELETE through diesel; select the
        // oldest keys first, then delete them. Two statements, tiny sets.
        let oldest: Vec<(String, String)> = branch_metrics_cache::table
            .order(branch_metrics_cache::computed_at.asc())
            .limit(excess)
            .select((
                branch_metrics_cache::head_sha,
                branch_metrics_cache::branch_sha,
            ))
            .load(conn)?;
        for (head, branch) in &oldest {
            deleted += diesel::delete(
                branch_metrics_cache::table
                    .filter(branch_metrics_cache::head_sha.eq(head))
                    .filter(branch_metrics_cache::branch_sha.eq(branch)),
            )
            .execute(conn)?;
        }
    }

    Ok(deleted)
}

pub fn clear_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<usize, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::is_locked.eq(true)),
    )
    .set(branches::is_locked.eq(false))
    .execute(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::branch_management::filters::BranchFilters;
    use crate::shared::infrastructure::db::MIGRATIONS;
    use diesel_migrations::MigrationHarness;

    /// In-memory DB with all embedded migrations applied — this also proves
    /// the commit-normalization migration itself is valid SQL.
    fn test_conn() -> SqliteConnection {
        let mut conn = SqliteConnection::establish(":memory:").unwrap();
        diesel::sql_query("PRAGMA foreign_keys = ON;")
            .execute(&mut conn)
            .unwrap();
        conn.run_pending_migrations(MIGRATIONS).unwrap();
        conn
    }

    fn insert_repository(conn: &mut SqliteConnection, repo_id: &str) {
        diesel::insert_into(repositories::table)
            .values((
                repositories::id.eq(repo_id),
                repositories::name.eq("repo"),
                repositories::path.eq("/tmp/repo"),
                repositories::current_branch.eq("main"),
                repositories::branches_count.eq(0),
            ))
            .execute(conn)
            .unwrap();
    }

    fn commit_record(sha: &str) -> NewCommitRecord {
        NewCommitRecord {
            sha: sha.to_string(),
            short_sha: sha[..7].to_string(),
            date: "2026-07-18T00:00:00Z".to_string(),
            message: "feat: subject\n\nbody".to_string(),
            summary: "feat: subject".to_string(),
            author: "Author".to_string(),
            email: "author@example.com".to_string(),
        }
    }

    fn branch_record(repo_id: &str, name: &str, sha: &str) -> NewBranchRecord {
        NewBranchRecord {
            repository_id: repo_id.to_string(),
            name: name.to_string(),
            current: false,
            fully_merged: false,
            head_commit_sha: sha.to_string(),
            upstream: None,
            deleted_at: None,
            is_reachable: None,
            is_selected: false,
            is_locked: false,
        }
    }

    const SHA_A: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const SHA_B: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    #[test]
    fn upsert_commits_batch_is_idempotent_and_skips_duplicates() {
        let mut conn = test_conn();

        let inserted =
            upsert_commits_batch(&mut conn, &[commit_record(SHA_A), commit_record(SHA_B)]).unwrap();
        assert_eq!(inserted, 2);

        // Re-inserting the same SHAs is a no-op, not an error.
        let inserted = upsert_commits_batch(&mut conn, &[commit_record(SHA_A)]).unwrap();
        assert_eq!(inserted, 0);

        let empty: Vec<NewCommitRecord> = vec![];
        assert_eq!(upsert_commits_batch(&mut conn, &empty).unwrap(), 0);
    }

    #[test]
    fn get_branches_joins_head_commit() {
        let mut conn = test_conn();
        insert_repository(&mut conn, "repo-1");
        upsert_commits_batch(&mut conn, &[commit_record(SHA_A)]).unwrap();
        upsert_branches_batch(&mut conn, &[branch_record("repo-1", "main", SHA_A)]).unwrap();

        let rows =
            get_branches_for_repository(&mut conn, "repo-1", &BranchFilters::default()).unwrap();
        assert_eq!(rows.len(), 1);
        let (branch, commit) = &rows[0];
        assert_eq!(branch.name, "main");
        assert_eq!(branch.head_commit_sha, SHA_A);
        assert_eq!(commit.sha, SHA_A);
        assert_eq!(commit.summary, "feat: subject");
    }

    #[test]
    fn delete_orphan_commits_keeps_soft_deleted_branch_commits() {
        let mut conn = test_conn();
        insert_repository(&mut conn, "repo-1");
        upsert_commits_batch(&mut conn, &[commit_record(SHA_A), commit_record(SHA_B)]).unwrap();
        upsert_branches_batch(&mut conn, &[branch_record("repo-1", "feature", SHA_A)]).unwrap();
        mark_branches_deleted(&mut conn, "repo-1", &["feature".to_string()]).unwrap();

        // SHA_A is referenced by a soft-deleted branch and must survive;
        // SHA_B is referenced by nothing and must go.
        let pruned = delete_orphan_commits(&mut conn).unwrap();
        assert_eq!(pruned, 1);

        let remaining: Vec<String> = commits::table.select(commits::sha).load(&mut conn).unwrap();
        assert_eq!(remaining, vec![SHA_A.to_string()]);
    }

    fn metrics_row(head: &str, branch: &str) -> NewBranchMetricsCacheRecord {
        NewBranchMetricsCacheRecord {
            head_sha: head.to_string(),
            branch_sha: branch.to_string(),
            is_merged: false,
            lines_added: 3,
            lines_removed: 1,
        }
    }

    #[test]
    fn branch_metrics_cache_round_trips_per_head() {
        let mut conn = test_conn();
        upsert_branch_metrics_cache_batch(
            &mut conn,
            &[metrics_row(SHA_A, SHA_B), metrics_row(SHA_B, SHA_A)],
        )
        .unwrap();

        // Only the rows under the requested HEAD come back.
        let rows = get_branch_metrics_cache_batch(&mut conn, SHA_A, &[SHA_B.to_string()]).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].branch_sha, SHA_B);
        assert_eq!(rows[0].lines_added, 3);

        // Same pair again replaces rather than erroring, and updates values.
        let mut replacement = metrics_row(SHA_A, SHA_B);
        replacement.lines_added = 42;
        upsert_branch_metrics_cache_batch(&mut conn, &[replacement]).unwrap();
        let rows = get_branch_metrics_cache_batch(&mut conn, SHA_A, &[SHA_B.to_string()]).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].lines_added, 42);

        // Empty input is a no-op.
        assert_eq!(
            upsert_branch_metrics_cache_batch(&mut conn, &[]).unwrap(),
            0
        );
    }

    #[test]
    fn prune_branch_metrics_cache_drops_old_rows() {
        let mut conn = test_conn();
        upsert_branch_metrics_cache_batch(
            &mut conn,
            &[metrics_row(SHA_A, SHA_B), metrics_row(SHA_B, SHA_A)],
        )
        .unwrap();

        // Age one row past the retention window.
        diesel::update(
            branch_metrics_cache::table.filter(branch_metrics_cache::branch_sha.eq(SHA_A)),
        )
        .set(branch_metrics_cache::computed_at.eq(
            diesel::dsl::sql::<diesel::sql_types::Timestamp>("datetime('now', '-40 days')"),
        ))
        .execute(&mut conn)
        .unwrap();

        let deleted = prune_branch_metrics_cache(&mut conn).unwrap();
        assert_eq!(deleted, 1);
        let rows = get_branch_metrics_cache_batch(&mut conn, SHA_A, &[SHA_B.to_string()]).unwrap();
        assert_eq!(rows.len(), 1, "fresh row must survive");
    }
}

use super::schema::*;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

// Repository models
#[derive(Debug, Clone, Queryable, Selectable, Identifiable, Serialize, Deserialize, Type)]
#[diesel(table_name = repositories)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: String,
    pub current_branch: String,
    pub branches_count: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub last_sync_timestamp: Option<i32>,
    pub last_synced_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Insertable, AsChangeset, Serialize, Deserialize, Type)]
#[diesel(table_name = repositories)]
#[serde(rename_all = "camelCase")]
pub struct NewRepository {
    pub id: String,
    pub name: String,
    pub path: String,
    pub current_branch: String,
    pub branches_count: i32,
    pub last_sync_timestamp: Option<i32>,
    pub last_synced_at: Option<NaiveDateTime>,
}

// Cleanup history models (repository_cleanup domain)
#[derive(Debug, Clone, Queryable, Selectable, Identifiable, Serialize, Deserialize, Type)]
#[diesel(table_name = cleanup_history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct CleanupHistoryRecord {
    pub id: Option<i32>,
    pub repository_id: String,
    pub target_path: String,
    pub folder_name: String,
    #[specta(type = specta_typescript::Number)]
    pub bytes_freed: i64,
    pub deletion_mode: String,
    pub cleaned_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = cleanup_history)]
pub struct NewCleanupHistory {
    pub repository_id: String,
    pub target_path: String,
    pub folder_name: String,
    pub bytes_freed: i64,
    pub deletion_mode: String,
}

// Commit models (branch_management domain): one row per tip commit referenced
// by a branch. Kept even for soft-deleted branches so the UI can render their
// tip commit after git GC prunes it; orphan rows are swept during branch sync.
#[derive(Debug, Clone, Queryable, Selectable, Identifiable, Serialize, Deserialize, Type)]
#[diesel(table_name = commits)]
#[diesel(primary_key(sha))]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct CommitRecord {
    pub sha: String,
    pub short_sha: String,
    pub date: String,
    pub message: String,
    pub summary: String,
    pub author: String,
    pub email: String,
}

#[derive(Debug, Clone, Insertable, Serialize, Deserialize, Type)]
#[diesel(table_name = commits)]
#[serde(rename_all = "camelCase")]
pub struct NewCommitRecord {
    pub sha: String,
    pub short_sha: String,
    pub date: String,
    pub message: String,
    pub summary: String,
    pub author: String,
    pub email: String,
}

// Branch metrics cache (branch_management domain): one row per
// (HEAD tip sha, branch tip sha) pair ever measured. Content-addressed and
// immutable — see the migration comment. Internal only, so no serde/specta.
// Read model deliberately omits `head_sha` (the caller queried by it) and
// `computed_at` (pruning bookkeeping only).
#[derive(Debug, Clone, Queryable, Selectable)]
#[diesel(table_name = branch_metrics_cache)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BranchMetricsCacheRecord {
    pub branch_sha: String,
    pub is_merged: bool,
    pub lines_added: i32,
    pub lines_removed: i32,
}

#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = branch_metrics_cache)]
pub struct NewBranchMetricsCacheRecord {
    pub head_sha: String,
    pub branch_sha: String,
    pub is_merged: bool,
    pub lines_added: i32,
    pub lines_removed: i32,
}

// Branch models
#[derive(
    Debug, Clone, Queryable, Selectable, Identifiable, Associations, Serialize, Deserialize, Type,
)]
#[diesel(belongs_to(Repository, foreign_key = repository_id))]
#[diesel(table_name = branches)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct BranchRecord {
    pub id: Option<i32>,
    pub repository_id: String,
    pub name: String,
    pub current: bool,
    pub fully_merged: bool,
    pub head_commit_sha: String,
    pub upstream: Option<String>,
    pub deleted_at: Option<String>,
    pub is_reachable: Option<bool>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub is_selected: bool,
    pub is_locked: bool,
}

#[derive(Debug, Clone, Insertable, AsChangeset, Serialize, Deserialize, Type)]
#[diesel(table_name = branches)]
#[serde(rename_all = "camelCase")]
pub struct NewBranchRecord {
    pub repository_id: String,
    pub name: String,
    pub current: bool,
    pub fully_merged: bool,
    pub head_commit_sha: String,
    pub upstream: Option<String>,
    pub deleted_at: Option<String>,
    pub is_reachable: Option<bool>,
    pub is_selected: bool,
    pub is_locked: bool,
}

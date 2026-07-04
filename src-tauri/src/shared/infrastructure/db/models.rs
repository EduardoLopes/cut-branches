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
    pub last_commit_sha: String,
    pub last_commit_short_sha: String,
    pub last_commit_date: String,
    pub last_commit_message: String,
    pub last_commit_author: String,
    pub last_commit_email: String,
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
    pub last_commit_sha: String,
    pub last_commit_short_sha: String,
    pub last_commit_date: String,
    pub last_commit_message: String,
    pub last_commit_author: String,
    pub last_commit_email: String,
    pub deleted_at: Option<String>,
    pub is_reachable: Option<bool>,
    pub is_selected: bool,
    pub is_locked: bool,
}

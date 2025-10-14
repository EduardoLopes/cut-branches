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
    pub last_sync_hash: Option<String>,
    pub last_sync_timestamp: Option<i32>,
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
    pub last_sync_hash: Option<String>,
    pub last_sync_timestamp: Option<i32>,
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
}

// Selected branches models
#[derive(
    Debug, Clone, Queryable, Selectable, Identifiable, Associations, Serialize, Deserialize, Type,
)]
#[diesel(belongs_to(Repository, foreign_key = repository_id))]
#[diesel(table_name = selected_branches)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct SelectedBranch {
    pub id: Option<i32>,
    pub repository_id: String,
    pub branch_name: String,
    pub branch_context: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable, Serialize, Deserialize, Type)]
#[diesel(table_name = selected_branches)]
#[serde(rename_all = "camelCase")]
pub struct NewSelectedBranch {
    pub repository_id: String,
    pub branch_name: String,
    pub branch_context: String,
}

// Locked branches models
#[derive(
    Debug, Clone, Queryable, Selectable, Identifiable, Associations, Serialize, Deserialize, Type,
)]
#[diesel(belongs_to(Repository, foreign_key = repository_id))]
#[diesel(table_name = locked_branches)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct LockedBranch {
    pub id: Option<i32>,
    pub repository_id: String,
    pub branch_name: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable, Serialize, Deserialize, Type)]
#[diesel(table_name = locked_branches)]
#[serde(rename_all = "camelCase")]
pub struct NewLockedBranch {
    pub repository_id: String,
    pub branch_name: String,
}

// Settings models
#[derive(
    Debug, Clone, Queryable, Selectable, Identifiable, Associations, Serialize, Deserialize, Type,
)]
#[diesel(belongs_to(Repository, foreign_key = repository_id))]
#[diesel(table_name = settings)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub id: Option<i32>,
    pub repository_id: Option<String>,
    pub key: String,
    pub value: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable, AsChangeset, Serialize, Deserialize, Type)]
#[diesel(table_name = settings)]
#[serde(rename_all = "camelCase")]
pub struct NewSetting {
    pub repository_id: Option<String>,
    pub key: String,
    pub value: String,
}

// Notification models
#[derive(Debug, Clone, Queryable, Selectable, Identifiable, Serialize, Deserialize, Type)]
#[diesel(table_name = notifications)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: Option<String>,
    pub message: Option<String>,
    pub feedback: Option<String>,
    pub date: i32,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable, Serialize, Deserialize, Type)]
#[diesel(table_name = notifications)]
#[serde(rename_all = "camelCase")]
pub struct NewNotification {
    pub id: String,
    pub title: Option<String>,
    pub message: Option<String>,
    pub feedback: Option<String>,
    pub date: i32,
}

// Metadata models
#[derive(Debug, Clone, Queryable, Selectable, Identifiable, Serialize, Deserialize, Type)]
#[diesel(table_name = metadata)]
#[diesel(primary_key(key))]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub key: String,
    pub value: String,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable, AsChangeset, Serialize, Deserialize, Type)]
#[diesel(table_name = metadata)]
#[serde(rename_all = "camelCase")]
pub struct NewMetadata {
    pub key: String,
    pub value: String,
}

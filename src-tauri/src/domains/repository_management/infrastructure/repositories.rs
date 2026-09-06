//! Persistence adapters for the `repositories` table (this domain's data, guide 1.3).

use crate::shared::infrastructure::db::models::*;
use crate::shared::infrastructure::db::schema::*;
use diesel::prelude::*;
use diesel::result::Error as DieselError;

pub fn create_repository(
    conn: &mut SqliteConnection,
    new_repo: NewRepository,
) -> Result<Repository, DieselError> {
    diesel::insert_into(repositories::table)
        .values(&new_repo)
        .execute(conn)?;

    repositories::table
        .filter(repositories::id.eq(&new_repo.id))
        .first(conn)
}

pub fn get_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Repository, DieselError> {
    repositories::table.find(repo_id).first(conn)
}

pub fn get_repository_list(conn: &mut SqliteConnection) -> Result<Vec<Repository>, DieselError> {
    repositories::table.load(conn)
}

pub fn update_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
    updated_repo: NewRepository,
) -> Result<Repository, DieselError> {
    diesel::update(repositories::table.find(repo_id))
        .set(&updated_repo)
        .execute(conn)?;

    repositories::table.find(repo_id).first(conn)
}

pub fn delete_repository(conn: &mut SqliteConnection, repo_id: &str) -> Result<usize, DieselError> {
    diesel::delete(repositories::table.find(repo_id)).execute(conn)
}

/// Records that this repository was just synced from git. Bumped on every
/// command that reads from git and writes to the DB so the FE can show a
/// "Last synced X ago" indicator that survives app restarts.
pub fn bump_last_synced_at(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<usize, DieselError> {
    let now = chrono::Utc::now().naive_utc();
    diesel::update(repositories::table.find(repo_id))
        .set(repositories::last_synced_at.eq(Some(now)))
        .execute(conn)
}

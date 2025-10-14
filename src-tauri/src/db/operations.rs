use super::models::*;
use super::schema::*;
use diesel::prelude::*;
use diesel::result::Error as DieselError;

// Repository operations
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

pub fn get_repository_by_name(
    conn: &mut SqliteConnection,
    name: &str,
) -> Result<Repository, DieselError> {
    repositories::table
        .filter(repositories::name.eq(name))
        .first(conn)
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

// Branch operations
pub fn create_branch(
    conn: &mut SqliteConnection,
    new_branch: NewBranchRecord,
) -> Result<BranchRecord, DieselError> {
    diesel::insert_into(branches::table)
        .values(&new_branch)
        .execute(conn)?;

    branches::table
        .filter(branches::repository_id.eq(&new_branch.repository_id))
        .filter(branches::name.eq(&new_branch.name))
        .first(conn)
}

pub fn get_branches_for_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<BranchRecord>, DieselError> {
    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::deleted_at.is_null())
        .order(branches::name.asc())
        .load(conn)
}

pub fn get_deleted_branches_for_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<BranchRecord>, DieselError> {
    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::deleted_at.is_not_null())
        .order(branches::deleted_at.desc())
        .load(conn)
}

pub fn update_branch(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_name: &str,
    updated_branch: NewBranchRecord,
) -> Result<BranchRecord, DieselError> {
    diesel::update(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq(branch_name)),
    )
    .set(&updated_branch)
    .execute(conn)?;

    branches::table
        .filter(branches::repository_id.eq(repo_id))
        .filter(branches::name.eq(branch_name))
        .first(conn)
}

pub fn delete_branch(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_name: &str,
) -> Result<usize, DieselError> {
    diesel::delete(
        branches::table
            .filter(branches::repository_id.eq(repo_id))
            .filter(branches::name.eq(branch_name)),
    )
    .execute(conn)
}

pub fn upsert_branch(
    conn: &mut SqliteConnection,
    branch: NewBranchRecord,
) -> Result<BranchRecord, DieselError> {
    diesel::insert_into(branches::table)
        .values(&branch)
        .on_conflict((branches::repository_id, branches::name))
        .do_update()
        .set(&branch)
        .execute(conn)?;

    branches::table
        .filter(branches::repository_id.eq(&branch.repository_id))
        .filter(branches::name.eq(&branch.name))
        .first(conn)
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
    .set(branches::deleted_at.eq(Some(now)))
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
    .set(branches::deleted_at.eq(None::<String>))
    .execute(conn)
}

// Selected branches operations
pub fn add_selected_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
    branch_context: &str,
) -> Result<usize, DieselError> {
    let new_selected: Vec<NewSelectedBranch> = branch_names
        .into_iter()
        .map(|name| NewSelectedBranch {
            repository_id: repo_id.to_string(),
            branch_name: name,
            branch_context: branch_context.to_string(),
        })
        .collect();

    diesel::insert_or_ignore_into(selected_branches::table)
        .values(&new_selected)
        .execute(conn)
}

pub fn get_selected_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_context: &str,
) -> Result<Vec<SelectedBranch>, DieselError> {
    selected_branches::table
        .filter(selected_branches::repository_id.eq(repo_id))
        .filter(selected_branches::branch_context.eq(branch_context))
        .load(conn)
}

pub fn remove_selected_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
    branch_context: &str,
) -> Result<usize, DieselError> {
    diesel::delete(
        selected_branches::table
            .filter(selected_branches::repository_id.eq(repo_id))
            .filter(selected_branches::branch_name.eq_any(branch_names))
            .filter(selected_branches::branch_context.eq(branch_context)),
    )
    .execute(conn)
}

pub fn clear_selected_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_context: &str,
) -> Result<usize, DieselError> {
    diesel::delete(
        selected_branches::table
            .filter(selected_branches::repository_id.eq(repo_id))
            .filter(selected_branches::branch_context.eq(branch_context)),
    )
    .execute(conn)
}

// Locked branches operations
pub fn add_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<usize, DieselError> {
    let new_locked: Vec<NewLockedBranch> = branch_names
        .into_iter()
        .map(|name| NewLockedBranch {
            repository_id: repo_id.to_string(),
            branch_name: name,
        })
        .collect();

    diesel::insert_or_ignore_into(locked_branches::table)
        .values(&new_locked)
        .execute(conn)
}

pub fn get_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<LockedBranch>, DieselError> {
    locked_branches::table
        .filter(locked_branches::repository_id.eq(repo_id))
        .load(conn)
}

pub fn remove_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<usize, DieselError> {
    diesel::delete(
        locked_branches::table
            .filter(locked_branches::repository_id.eq(repo_id))
            .filter(locked_branches::branch_name.eq_any(branch_names)),
    )
    .execute(conn)
}

pub fn clear_locked_branches(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<usize, DieselError> {
    diesel::delete(locked_branches::table.filter(locked_branches::repository_id.eq(repo_id)))
        .execute(conn)
}

// Settings operations
pub fn set_setting(
    conn: &mut SqliteConnection,
    new_setting: NewSetting,
) -> Result<Setting, DieselError> {
    diesel::insert_into(settings::table)
        .values(&new_setting)
        .on_conflict((settings::repository_id, settings::key))
        .do_update()
        .set(&new_setting)
        .execute(conn)?;

    // Handle NULL comparison for repository_id
    let mut query = settings::table.into_boxed();
    match &new_setting.repository_id {
        Some(id) => query = query.filter(settings::repository_id.eq(id)),
        None => query = query.filter(settings::repository_id.is_null()),
    }
    query.filter(settings::key.eq(&new_setting.key)).first(conn)
}

pub fn get_setting(
    conn: &mut SqliteConnection,
    repo_id: Option<&str>,
    key: &str,
) -> Result<Setting, DieselError> {
    // Handle NULL comparison for repository_id
    let mut query = settings::table.into_boxed();
    match repo_id {
        Some(id) => query = query.filter(settings::repository_id.eq(id)),
        None => query = query.filter(settings::repository_id.is_null()),
    }
    query.filter(settings::key.eq(key)).first(conn)
}

pub fn delete_setting(
    conn: &mut SqliteConnection,
    repo_id: Option<&str>,
    key: &str,
) -> Result<usize, DieselError> {
    // Handle NULL comparison for repository_id
    match repo_id {
        Some(id) => diesel::delete(
            settings::table
                .filter(settings::repository_id.eq(id))
                .filter(settings::key.eq(key)),
        )
        .execute(conn),
        None => diesel::delete(
            settings::table
                .filter(settings::repository_id.is_null())
                .filter(settings::key.eq(key)),
        )
        .execute(conn),
    }
}

// Notification operations
pub fn create_notification(
    conn: &mut SqliteConnection,
    new_notification: NewNotification,
) -> Result<Notification, DieselError> {
    diesel::insert_into(notifications::table)
        .values(&new_notification)
        .execute(conn)?;

    notifications::table.find(&new_notification.id).first(conn)
}

pub fn get_notifications(
    conn: &mut SqliteConnection,
    limit: i64,
) -> Result<Vec<Notification>, DieselError> {
    notifications::table
        .order(notifications::date.desc())
        .limit(limit)
        .load(conn)
}

pub fn delete_notification(
    conn: &mut SqliteConnection,
    notification_id: &str,
) -> Result<usize, DieselError> {
    diesel::delete(notifications::table.find(notification_id)).execute(conn)
}

pub fn clear_notifications(conn: &mut SqliteConnection) -> Result<usize, DieselError> {
    diesel::delete(notifications::table).execute(conn)
}

// Metadata operations
pub fn set_metadata(
    conn: &mut SqliteConnection,
    new_metadata: NewMetadata,
) -> Result<Metadata, DieselError> {
    diesel::insert_into(metadata::table)
        .values(&new_metadata)
        .on_conflict(metadata::key)
        .do_update()
        .set(&new_metadata)
        .execute(conn)?;

    metadata::table.find(&new_metadata.key).first(conn)
}

pub fn get_metadata(conn: &mut SqliteConnection, key: &str) -> Result<Metadata, DieselError> {
    metadata::table.find(key).first(conn)
}

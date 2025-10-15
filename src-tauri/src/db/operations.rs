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
    filters: &crate::domains::branch_management::filters::BranchFilters,
) -> Result<Vec<BranchRecord>, DieselError> {
    use crate::domains::branch_management::filters::*;

    let mut query = branches::table
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

/// Deprecated: Use get_branches_for_repository with DeletionStatusFilter::Deleted instead
#[deprecated(
    since = "0.1.0",
    note = "Use get_branches_for_repository with filters.deletion_status = DeletionStatusFilter::Deleted"
)]
pub fn get_deleted_branches_for_repository(
    conn: &mut SqliteConnection,
    repo_id: &str,
) -> Result<Vec<BranchRecord>, DieselError> {
    let filters = crate::domains::branch_management::filters::BranchFilters {
        deletion_status: crate::domains::branch_management::filters::DeletionStatusFilter::Deleted,
        ..Default::default()
    };
    get_branches_for_repository(conn, repo_id, &filters)
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
                branches::last_commit_sha.eq(&branch.last_commit_sha),
                branches::last_commit_short_sha.eq(&branch.last_commit_short_sha),
                branches::last_commit_date.eq(&branch.last_commit_date),
                branches::last_commit_message.eq(&branch.last_commit_message),
                branches::last_commit_author.eq(&branch.last_commit_author),
                branches::last_commit_email.eq(&branch.last_commit_email),
                branches::is_reachable.eq(&branch.is_reachable),
                // Note: is_selected, is_locked, and deleted_at are intentionally excluded
                // to preserve user-managed state during sync operations
            ))
            .execute(conn)?;
        total_inserted += 1;
    }

    Ok(total_inserted)
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

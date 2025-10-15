use tauri::State;

use crate::db::{operations, DatabaseState};
use crate::shared::error::AppError;

/// Update selection status for specific branches
pub fn update_branch_selection_batch(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_names: Vec<String>,
    is_selected: bool,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::update_branch_selection_batch(&mut conn, repo_id, branch_names, is_selected)
        .map_err(|e| {
            AppError::new(
                "Failed to update branch selection".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;

    Ok(())
}

/// Get all selected branches for a repository (active branches only)
pub fn get_branch_selection_list(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::get_branch_selection_list(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to get selected branches".to_string(),
            "db_get_failed",
            Some(e.to_string()),
        )
    })
}

/// Get all selected deleted branches for a repository
pub fn get_deleted_branch_selection_list(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::get_deleted_branch_selection_list(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to get selected deleted branches".to_string(),
            "db_get_failed",
            Some(e.to_string()),
        )
    })
}

/// Set all branches to selected/unselected based on deletion status filter
pub fn set_branch_selection_all(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    is_selected: bool,
    deletion_status: super::super::filters::DeletionStatusFilter,
    exclude_locked: bool,
    exclude_current: bool,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::set_branch_selection_all(
        &mut conn,
        repo_id,
        is_selected,
        deletion_status,
        exclude_locked,
        exclude_current,
    )
    .map_err(|e| {
        AppError::new(
            "Failed to set branch selection".to_string(),
            "db_set_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

use tauri::State;

use crate::shared::error::AppError;
use crate::shared::infrastructure::db::{operations, DatabaseState};

/// Get all locked branches for a repository
pub fn get_locked_branches(
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

    operations::get_locked_branches(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to get locked branches".to_string(),
            "db_get_failed",
            Some(e.to_string()),
        )
    })
}

/// Add branches to the locked list
pub fn add_locked_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::add_locked_branches(&mut conn, repo_id, branch_names).map_err(|e| {
        AppError::new(
            "Failed to add locked branches".to_string(),
            "db_add_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

/// Remove branches from the locked list
pub fn remove_locked_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_names: Vec<String>,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::remove_locked_branches(&mut conn, repo_id, branch_names).map_err(|e| {
        AppError::new(
            "Failed to remove locked branches".to_string(),
            "db_remove_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

/// Clear all locked branches for a repository
pub fn clear_locked_branches(db: &State<'_, DatabaseState>, repo_id: &str) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::clear_locked_branches(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to clear locked branches".to_string(),
            "db_clear_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

use tauri::State;

use crate::db::{operations, DatabaseState};
use crate::shared::error::AppError;

// Default (active branches) operations

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

/// Add branches to the selected list (active branches)
pub fn add_branch_selection_batch(
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

    operations::add_branch_selection_batch(&mut conn, repo_id, branch_names).map_err(|e| {
        AppError::new(
            "Failed to add selected branches".to_string(),
            "db_add_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

/// Remove branches from the selected list (active branches)
pub fn remove_branch_selection_batch(
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

    operations::remove_branch_selection_batch(&mut conn, repo_id, branch_names).map_err(|e| {
        AppError::new(
            "Failed to remove selected branches".to_string(),
            "db_remove_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

/// Clear all selected branches for a repository (active branches)
pub fn clear_branch_selection(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::clear_branch_selection(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to clear selected branches".to_string(),
            "db_clear_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

// Deleted branches (restoration) operations

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

/// Add deleted branches to the selected list
pub fn add_deleted_branch_selection_batch(
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

    operations::add_deleted_branch_selection_batch(&mut conn, repo_id, branch_names).map_err(
        |e| {
            AppError::new(
                "Failed to add selected deleted branches".to_string(),
                "db_add_failed",
                Some(e.to_string()),
            )
        },
    )?;

    Ok(())
}

/// Remove deleted branches from the selected list
pub fn remove_deleted_branch_selection_batch(
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

    operations::remove_deleted_branch_selection_batch(&mut conn, repo_id, branch_names).map_err(
        |e| {
            AppError::new(
                "Failed to remove selected deleted branches".to_string(),
                "db_remove_failed",
                Some(e.to_string()),
            )
        },
    )?;

    Ok(())
}

/// Clear all selected deleted branches for a repository
pub fn clear_deleted_branch_selection(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::clear_deleted_branch_selection(&mut conn, repo_id).map_err(|e| {
        AppError::new(
            "Failed to clear selected deleted branches".to_string(),
            "db_clear_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

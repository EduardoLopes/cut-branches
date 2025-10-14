use tauri::State;

use crate::db::{operations, DatabaseState};
use crate::shared::error::AppError;

/// Get all selected branches for a repository
pub fn get_selected_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_context: &str,
) -> Result<Vec<String>, AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::get_selected_branches(&mut conn, repo_id, branch_context)
        .map(|branches| branches.into_iter().map(|b| b.branch_name).collect())
        .map_err(|e| {
            AppError::new(
                "Failed to get selected branches".to_string(),
                "db_get_failed",
                Some(e.to_string()),
            )
        })
}

/// Add branches to the selected list
pub fn add_selected_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_names: Vec<String>,
    branch_context: &str,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::add_selected_branches(&mut conn, repo_id, branch_names, branch_context).map_err(
        |e| {
            AppError::new(
                "Failed to add selected branches".to_string(),
                "db_add_failed",
                Some(e.to_string()),
            )
        },
    )?;

    Ok(())
}

/// Remove branches from the selected list
pub fn remove_selected_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_names: Vec<String>,
    branch_context: &str,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::remove_selected_branches(&mut conn, repo_id, branch_names, branch_context)
        .map_err(|e| {
            AppError::new(
                "Failed to remove selected branches".to_string(),
                "db_remove_failed",
                Some(e.to_string()),
            )
        })?;

    Ok(())
}

/// Clear all selected branches for a repository
pub fn clear_selected_branches(
    db: &State<'_, DatabaseState>,
    repo_id: &str,
    branch_context: &str,
) -> Result<(), AppError> {
    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    operations::clear_selected_branches(&mut conn, repo_id, branch_context).map_err(|e| {
        AppError::new(
            "Failed to clear selected branches".to_string(),
            "db_clear_failed",
            Some(e.to_string()),
        )
    })?;

    Ok(())
}

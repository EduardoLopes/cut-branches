use serde::{Deserialize, Serialize};
use tauri::State;

use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRepositoryInput {
    pub id: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRepositoryOutput {
    pub success: bool,
}

/// Deletes a repository from the database.
///
/// # Arguments
///
/// * `db` - Database state for repository deletion
/// * `input` - Input parameters containing the repository ID
///
/// # Returns
///
/// * `Result<DeleteRepositoryOutput, AppError>` - Success status or an error
#[tauri::command]
#[specta::specta]
pub fn delete_repository(
    db: State<'_, DatabaseState>,
    input: DeleteRepositoryInput,
) -> Result<DeleteRepositoryOutput, AppError> {
    println!("Attempting to delete repository with ID: {}", input.id);

    let mut conn = db.get_connection().map_err(|e| {
        AppError::new(
            "Failed to get database connection".to_string(),
            "db_connection_failed",
            Some(e),
        )
    })?;

    let rows_affected =
        crate::domains::repository_management::infrastructure::repositories::delete_repository(
            &mut conn, &input.id,
        )
        .map_err(|e| {
            println!("Error deleting repository: {:?}", e);
            AppError::new(
                "Failed to delete repository".to_string(),
                "db_delete_failed",
                Some(e.to_string()),
            )
        })?;

    // Force a WAL checkpoint to ensure the deletion is written to disk
    use diesel::RunQueryDsl;
    diesel::sql_query("PRAGMA wal_checkpoint(TRUNCATE);")
        .execute(&mut *conn)
        .ok(); // Ignore errors, this is just for ensuring persistence

    println!("Deleted repository. Rows affected: {}", rows_affected);

    // Drop the connection explicitly to return it to the pool
    drop(conn);

    Ok(DeleteRepositoryOutput { success: true })
}

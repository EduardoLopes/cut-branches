// TODO(step-4-migration): Foundation only. The blanket
// `From<diesel::result::Error> for AppError` in `shared/error.rs` is preserved
// for now to avoid forcing every db call site to migrate at once. New code
// should prefer `DatabaseError` and let `?` translate to `AppError` at the
// command boundary. Migrate `db/operations/*.rs` and the `services/*.rs` files
// that wrap diesel ops file-by-file.

use thiserror::Error;

use crate::shared::error::AppError;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Failed to acquire database connection: {reason}")]
    ConnectionFailed { reason: String },

    #[error("Failed to query database: {source}")]
    QueryFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to insert record: {source}")]
    CreateFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to update record: {source}")]
    UpdateFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to delete record: {source}")]
    DeleteFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to fetch record: {source}")]
    GetFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to list records: {source}")]
    ListFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to add to collection: {source}")]
    AddFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to remove from collection: {source}")]
    RemoveFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to set value: {source}")]
    SetFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to clear collection: {source}")]
    ClearFailed {
        #[source]
        source: diesel::result::Error,
    },

    #[error("Failed to batch upsert: {source}")]
    BatchUpsertFailed {
        #[source]
        source: diesel::result::Error,
    },
}

impl From<DatabaseError> for AppError {
    fn from(err: DatabaseError) -> Self {
        let kind = match &err {
            DatabaseError::ConnectionFailed { .. } => "db_connection_failed",
            DatabaseError::QueryFailed { .. } => "db_query_failed",
            DatabaseError::CreateFailed { .. } => "db_create_failed",
            DatabaseError::UpdateFailed { .. } => "db_update_failed",
            DatabaseError::DeleteFailed { .. } => "db_delete_failed",
            DatabaseError::GetFailed { .. } => "db_get_failed",
            DatabaseError::ListFailed { .. } => "db_list_failed",
            DatabaseError::AddFailed { .. } => "db_add_failed",
            DatabaseError::RemoveFailed { .. } => "db_remove_failed",
            DatabaseError::SetFailed { .. } => "db_set_failed",
            DatabaseError::ClearFailed { .. } => "db_clear_failed",
            DatabaseError::BatchUpsertFailed { .. } => "db_batch_upsert_failed",
        };

        let description = match &err {
            DatabaseError::ConnectionFailed { reason } => Some(reason.clone()),
            DatabaseError::QueryFailed { source }
            | DatabaseError::CreateFailed { source }
            | DatabaseError::UpdateFailed { source }
            | DatabaseError::DeleteFailed { source }
            | DatabaseError::GetFailed { source }
            | DatabaseError::ListFailed { source }
            | DatabaseError::AddFailed { source }
            | DatabaseError::RemoveFailed { source }
            | DatabaseError::SetFailed { source }
            | DatabaseError::ClearFailed { source }
            | DatabaseError::BatchUpsertFailed { source } => Some(source.to_string()),
        };

        AppError::new(err.to_string(), kind, description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_connection_failed_to_legacy_kind() {
        let app: AppError = DatabaseError::ConnectionFailed {
            reason: "pool exhausted".into(),
        }
        .into();
        assert_eq!(app.kind, "db_connection_failed");
        assert_eq!(app.description.as_deref(), Some("pool exhausted"));
    }

    #[test]
    fn maps_query_failed_to_legacy_kind() {
        let app: AppError = DatabaseError::QueryFailed {
            source: diesel::result::Error::NotFound,
        }
        .into();
        assert_eq!(app.kind, "db_query_failed");
    }
}

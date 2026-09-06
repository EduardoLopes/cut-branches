//! Persistence adapter for the `cleanup_history` audit log (this domain's data,
//! §1.3). Records one row per folder successfully deleted.

use diesel::prelude::*;
use diesel::result::Error as DieselError;

use crate::shared::infrastructure::db::models::NewCleanupHistory;
use crate::shared::infrastructure::db::schema::cleanup_history;

/// Insert one audit row. Best-effort at the call site: a failed audit write must
/// not undo a deletion that already happened.
pub fn record_cleanup(
    conn: &mut SqliteConnection,
    entry: NewCleanupHistory,
) -> Result<usize, DieselError> {
    diesel::insert_into(cleanup_history::table)
        .values(&entry)
        .execute(conn)
}

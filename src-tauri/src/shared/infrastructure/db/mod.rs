pub(crate) mod error;
pub(crate) mod models;
pub(crate) mod schema;

use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager, Pool};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

/// Custom connection customizer to set SQLite pragmas
#[derive(Debug, Clone, Copy)]
pub struct SqliteConnectionCustomizer;

impl r2d2::CustomizeConnection<SqliteConnection, diesel::r2d2::Error>
    for SqliteConnectionCustomizer
{
    fn on_acquire(&self, conn: &mut SqliteConnection) -> Result<(), diesel::r2d2::Error> {
        use diesel::RunQueryDsl;

        // Set the busy timeout FIRST. It is a per-connection setting, and every
        // subsequent pragma/query on this connection must be able to wait for a
        // lock instead of failing immediately with SQLITE_BUSY ("database is
        // locked"). Setting it before anything that can contend for a lock is
        // what prevents those errors.
        diesel::sql_query("PRAGMA busy_timeout = 5000;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

        // Recommended companion to WAL: NORMAL is safe under WAL and avoids an
        // fsync on every commit, reducing how long write locks are held.
        diesel::sql_query("PRAGMA synchronous = NORMAL;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

        // Enable foreign keys (per-connection setting).
        diesel::sql_query("PRAGMA foreign_keys = ON;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

        // NOTE: `journal_mode = WAL` is intentionally NOT set here. It is a
        // persistent, database-level setting applied once at pool init (see
        // `initialize_pool`). Re-applying it on every checkout re-acquires a
        // write lock each time, which was the source of the recurring
        // "database is locked" errors.

        Ok(())
    }
}

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

pub type DbPool = Pool<ConnectionManager<SqliteConnection>>;
pub type DbConnection = r2d2::PooledConnection<ConnectionManager<SqliteConnection>>;

/// Get the database path for the application
pub fn get_database_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

    app_data_dir.join("app_data.db")
}

/// Initialize the database pool and run migrations
pub fn initialize_pool(app_handle: &AppHandle) -> Result<DbPool, Box<dyn std::error::Error>> {
    let database_path = get_database_path(app_handle);
    let database_url = database_path
        .to_str()
        .ok_or("Invalid database path")?
        .to_string();

    let manager = ConnectionManager::<SqliteConnection>::new(&database_url);
    let pool = Pool::builder()
        .max_size(5)
        .connection_customizer(Box::new(SqliteConnectionCustomizer))
        .build(manager)
        .expect("Failed to create pool");

    // Enable WAL mode once. It is a persistent, database-level setting stored in
    // the DB file, so it survives across connections and does not need to be
    // re-applied on every checkout.
    let mut conn = pool.get()?;
    diesel::sql_query("PRAGMA journal_mode = WAL;").execute(&mut conn)?;

    // Run migrations
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");

    Ok(pool)
}

/// Database state manager for Tauri
pub struct DatabaseState {
    pool: Arc<Mutex<Option<DbPool>>>,
}

impl DatabaseState {
    pub fn new() -> Self {
        Self {
            pool: Arc::new(Mutex::new(None)),
        }
    }

    pub fn initialize(&self, app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let pool = initialize_pool(app_handle)?;
        let mut state = self.pool.lock().unwrap();
        *state = Some(pool);
        Ok(())
    }

    pub fn get_connection(&self) -> Result<DbConnection, String> {
        let state = self.pool.lock().unwrap();
        match state.as_ref() {
            Some(pool) => pool.get().map_err(|e| e.to_string()),
            None => Err("Database not initialized".to_string()),
        }
    }

    /// Resolve a pooled connection, translating the low-level error into the
    /// shared `AppError` vocabulary. Delivery handlers call this and hand the
    /// connection to application use-cases (which no longer know about Tauri).
    pub fn connection(&self) -> Result<DbConnection, crate::shared::error::AppError> {
        self.get_connection().map_err(|e| {
            crate::shared::error::AppError::new(
                "Failed to get database connection".to_string(),
                "db_connection_failed",
                Some(e),
            )
        })
    }
}

impl Default for DatabaseState {
    fn default() -> Self {
        Self::new()
    }
}

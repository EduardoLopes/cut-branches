pub mod models;
pub mod operations;
pub mod schema;

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

        // Enable WAL mode for better concurrent access
        diesel::sql_query("PRAGMA journal_mode = WAL;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

        // Set busy timeout to 5 seconds
        diesel::sql_query("PRAGMA busy_timeout = 5000;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

        // Enable foreign keys
        diesel::sql_query("PRAGMA foreign_keys = ON;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;

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

    // Run migrations
    let mut conn = pool.get()?;
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
}

impl Default for DatabaseState {
    fn default() -> Self {
        Self::new()
    }
}

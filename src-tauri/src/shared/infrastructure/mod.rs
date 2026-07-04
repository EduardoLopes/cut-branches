//! Shared infrastructure (§2): infrastructure wrappers used by more than one
//! domain — the database connection pool + migration runner, and shared git
//! repository validation. Domains reach these through the composition root or
//! via their own `core/application/` layer; `core/models/` never touches them.

pub mod db;
pub(crate) mod git;
pub mod watcher;

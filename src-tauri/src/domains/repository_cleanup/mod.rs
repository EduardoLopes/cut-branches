//! Repository cleanup domain (§1.1): reclaims disk space by deleting stale,
//! regenerable dependency/build folders (`node_modules`, `target`, …) from
//! repositories. Destructive, so every deletion is re-validated server-side
//! here (the delivery `clean_repository` command is the security boundary, not
//! the frontend confirmation dialogs).
//!
//! This domain must not import other domains (§1.3). Registered-repository data
//! (owned by `repository_management`) is read through the `RepositoryCatalog`
//! port defined in `core::ports`; the composition root wires an adapter that
//! delegates to that domain's public operations.

pub mod commands;
pub(crate) mod core;
pub(crate) mod error;
pub mod events;
pub(crate) mod infrastructure;

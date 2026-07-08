//! A cleanable folder discovered inside a repository, with its size and why it
//! was flagged. Pure data (§1.2) — no I/O; the scanner and sizing infrastructure
//! populate it.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Why a folder was proposed for cleanup.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum TargetSource {
    /// Folder name is on the configured allowlist (e.g. `node_modules`).
    Allowlist,
    /// Folder is ignored by the repository's `.gitignore` (assist mode).
    Gitignore,
}

/// A single cleanable directory and its measured size.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CleanupTarget {
    /// Absolute path to the directory.
    pub path: String,
    /// The directory's own name (last path component), e.g. `node_modules`.
    pub folder_name: String,
    /// Total size on disk in bytes.
    pub size_bytes: u64,
    /// Why this folder was flagged.
    pub source: TargetSource,
}

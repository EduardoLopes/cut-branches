//! A cleanable folder discovered inside a repository, with its size. Pure data
//! (§1.2) — no I/O; the scanner and sizing infrastructure populate it.

use serde::{Deserialize, Serialize};
use specta::Type;

/// A single cleanable directory and its measured size. Every target is
/// discovered from the repository's `.gitignore` stack.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CleanupTarget {
    /// Absolute path to the directory.
    pub path: String,
    /// The directory's own name (last path component), e.g. `node_modules`.
    pub folder_name: String,
    /// Total size on disk in bytes.
    #[specta(type = specta_typescript::Number)]
    pub size_bytes: u64,
}

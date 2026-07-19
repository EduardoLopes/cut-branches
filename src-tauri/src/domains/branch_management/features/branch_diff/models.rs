//! Diff domain models for the review view.
//!
//! Deliberately structured for rendering, not for reproducing git's wire
//! format: hunks carry per-line old/new line numbers so the frontend can
//! paint a two-column gutter, and line content is plain text (no `+`/`-`
//! prefix — the `kind` field carries that) so syntax highlighting can run on
//! the code alone.

use serde::{Deserialize, Serialize};

/// What happened to a file between the two trees.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileChangeStatus {
    Added,
    Deleted,
    Modified,
    Renamed,
}

/// One entry in the changed-files list.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    /// Path in the target tree (old path for deleted files).
    pub path: String,
    /// Previous path, present only for renames.
    pub old_path: Option<String>,
    pub status: FileChangeStatus,
    pub lines_added: u32,
    pub lines_removed: u32,
    pub is_binary: bool,
}

/// The role of a single diff line.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DiffLineKind {
    Context,
    Added,
    Removed,
}

/// One line inside a hunk. Content excludes the trailing newline and the
/// leading origin marker.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub content: String,
    /// Line number in the base tree; `None` for added lines.
    pub old_line_no: Option<u32>,
    /// Line number in the target tree; `None` for removed lines.
    pub new_line_no: Option<u32>,
}

/// A contiguous region of change with surrounding context lines.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    /// The `@@ -a,b +c,d @@ …` header as git prints it.
    pub header: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

/// The full textual diff of a single file.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileChangeStatus,
    /// Binary files carry no hunks.
    pub is_binary: bool,
    /// True when the diff exceeded the per-file line cap and was cut short.
    pub truncated: bool,
    pub hunks: Vec<DiffHunk>,
}

//! Structure models for the diff review view's code analysis.
//!
//! Shaped for rendering, mirroring the sibling `branch_diff` models: the
//! canvas view consumes `edges` directly, the list view derives per-file
//! import/imported-by counts from them, and `changed_symbols` powers the
//! "what functions changed" summaries. The edge `kind` is an enum so a later
//! phase can add symbol-level relations (`Call`, `TypeRef`) without breaking
//! the shape.

use serde::{Deserialize, Serialize};

/// The grammar used to parse a changed file.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StructureLanguage {
    Typescript,
    Javascript,
    Svelte,
    /// Anything without a supported grammar — the file still appears as a
    /// node, just with no parsed internals.
    Unknown,
}

/// What kind of definition a changed symbol is.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SymbolKind {
    Function,
    Method,
    Class,
    /// A Svelte component (synthetic whole-file symbol).
    Component,
}

/// A definition whose line range intersects the file's changed lines.
///
/// Note on deletions: a pure-deletion hunk is attributed to the new-side line
/// where the deletion happened, so a deletion exactly at a symbol boundary
/// may credit the neighboring symbol — acceptable for a review summary.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChangedSymbol {
    pub name: String,
    pub kind: SymbolKind,
    /// 1-based line of the definition on the diff's target side.
    pub start_line: u32,
    pub end_line: u32,
}

/// One import found in a changed file.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileImport {
    /// The specifier as written: `./foo`, `$ui/x`, `react`.
    pub specifier: String,
    /// Repo-relative path this import resolves to — set only when the target
    /// is another CHANGED file (v1 scope); packages and unchanged files stay
    /// `None`.
    pub resolved_path: Option<String>,
}

/// The relation an edge represents.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StructureEdgeKind {
    Import,
}

/// A directed relation between two changed files (`from` imports `to`).
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StructureEdge {
    pub from: String,
    pub to: String,
    pub kind: StructureEdgeKind,
}

/// The analyzed structure of one changed file.
#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileStructure {
    /// Path in the target tree (old path for deleted files).
    pub path: String,
    pub language: StructureLanguage,
    /// False for unknown languages, deleted/binary files, oversized blobs,
    /// and parse failures — all non-fatal.
    pub parsed: bool,
    pub changed_symbols: Vec<ChangedSymbol>,
    pub imports: Vec<FileImport>,
}

//! Code-structure analysis of a diff — the data source for the review
//! view's canvas mode and its list-view impact badges.
//!
//! A sibling feature slice of `branch_diff` (guide §1.8, Approach 2): both
//! share the parent domain's git plumbing (`infrastructure::git::diff` —
//! `DiffTarget`, tree resolution, the rename-detecting diff), its error
//! vocabulary, and its core models; this slice adds tree-sitter parsing on
//! top. The slices never import from each other.
//!
//! For every file changed by a branch or commit the analysis reports which
//! definitions the hunks touch and which of the OTHER
//! changed files it imports — file-level edges only in this phase; the
//! models leave room for symbol-level relations later.

pub mod analysis;
pub mod application;
pub mod commands;
pub mod models;
pub mod resolve;

pub use commands::get_diff_structure;

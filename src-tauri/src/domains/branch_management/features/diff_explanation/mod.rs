//! AI diff-explanation feature — streams per-file, agent-generated
//! explanations of a diff into the review view.
//!
//! A sibling feature slice of `branch_diff` / `code_structure` (guide §1.8,
//! Approach 2): it reuses the parent domain's git plumbing (via `branch_diff`'s
//! diff extraction) and value objects, and adds a pluggable local-CLI agent on
//! top. The agent is an `Explainer` *port* (`agent`) with a `CliExplainer`
//! *adapter* that runs the configured binary with `tokio::process` — so
//! swapping Claude Code for another CLI is a config change, not a code change.
//!
//! The Rust backend *is* the bridge: it spawns the child, streams its stdout,
//! and pushes typed events (`events`) into the webview. No localhost port, no
//! WebSocket, no `tauri-plugin-shell` capability (the spawn is trusted Rust).

pub mod agent;
pub mod application;
pub mod commands;
pub mod events;
pub mod models;

pub use commands::{
    cancel_explanation, create_diff_explanation_batch, create_file_explanation,
    create_hunk_explanation, ExplanationRegistry,
};
pub use models::{AgentConfig, ExplanationStyle};

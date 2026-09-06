//! Typed events streamed to the frontend while an agent produces a diff
//! explanation. `explanation-chunk` carries incremental text as it arrives;
//! the two batch events let the "Generate all" flow fill each file's panel in
//! as it completes. All three are throttled/emitted by the commands, mirroring
//! the cleanup domain's progress events.
//!
//! `request_id` is the correlation id the frontend chose: the per-file
//! `requestId` for a single explanation, or the `batchId` for every file in a
//! batch — so a batch composable can filter every stream by one id.

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

/// One incremental slice of an explanation's text. Deltas are coalesced on a
/// light timer before emission, so this fires a handful of times per file
/// rather than once per token.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplanationChunkEvent {
    /// Correlation id (single: `requestId`; batch: `batchId`).
    pub request_id: String,
    /// Path of the file this delta explains.
    pub file_path: String,
    /// Text produced since the previous chunk.
    pub delta: String,
}

impl Event for ExplanationChunkEvent {
    const NAME: &'static str = "explanation-chunk";
}

/// Emitted once a file's explanation finishes (success or per-file failure) —
/// only used by the batch flow, where the command return value can't carry
/// per-file results. `error` is set instead of `text` when that file failed.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplanationFileCompletedEvent {
    /// Correlation id (the `batchId`).
    pub request_id: String,
    pub file_path: String,
    /// Full accumulated explanation; empty when `error` is set.
    pub text: String,
    /// Present when this file's explanation failed; the batch continues.
    pub error: Option<String>,
}

impl Event for ExplanationFileCompletedEvent {
    const NAME: &'static str = "explanation-file-completed";
}

/// Emitted after each file in a batch is processed, so the UI can show
/// `done / total` progress.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplanationBatchProgressEvent {
    pub batch_id: String,
    /// Files processed so far (completed or failed).
    pub done: u32,
    /// Total files in the batch.
    pub total: u32,
}

impl Event for ExplanationBatchProgressEvent {
    const NAME: &'static str = "explanation-batch-progress";
}

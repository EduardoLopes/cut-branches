//! Delivery: the Tauri commands that produce diff explanations.
//!
//! Same target contract as the sibling `branch_diff`/`code_structure` slices:
//! exactly one of `branch_name` / `commit_sha`, validated at the boundary. The
//! agent runs asynchronously; text streams to the frontend via
//! `ExplanationChunkEvent`, and the command returns the full text when done.
//! Cancellation is a managed registry of one-shot kill signals keyed by the
//! caller's `requestId` / `batchId`: firing one drops the in-flight explain
//! future, whose `CliExplainer` child is `kill_on_drop`.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_specta::Event;
use tokio::sync::oneshot;

use super::agent::CliExplainer;
use super::application;
use super::events::{
    ExplanationBatchProgressEvent, ExplanationChunkEvent, ExplanationFileCompletedEvent,
};
use super::models::{AgentConfig, ExplanationDetail, ExplanationStyle};
use crate::domains::branch_management::core::models::branch_name::BranchName;
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::domains::branch_management::features::branch_diff::git::DiffTarget;
use crate::shared::error::AppError;

/// Tracks in-flight explanations so they can be cancelled. Each entry is a
/// one-shot sender whose fire cancels the run keyed by that id.
#[derive(Default)]
pub struct ExplanationRegistry {
    inner: Mutex<HashMap<String, oneshot::Sender<()>>>,
}

impl ExplanationRegistry {
    /// Registers `id` and returns the receiver to select on. A second
    /// registration under the same id supersedes (and cancels) the first.
    fn register(&self, id: String) -> oneshot::Receiver<()> {
        let (tx, rx) = oneshot::channel();
        self.inner.lock().unwrap().insert(id, tx);
        rx
    }

    /// Removes `id` without firing — called when a run finishes normally.
    fn deregister(&self, id: &str) {
        self.inner.lock().unwrap().remove(id);
    }

    /// Fires the kill signal for `id`, returning whether one was in flight.
    fn cancel(&self, id: &str) -> bool {
        match self.inner.lock().unwrap().remove(id) {
            Some(tx) => tx.send(()).is_ok(),
            None => false,
        }
    }
}

/// A diff target validated at the boundary (exactly one of branch / commit),
/// reduced to an owned, cloneable form. Owned + `'static` so it can be moved
/// (and cloned per file) into `spawn_blocking` closures without the
/// use-after-conditional-move the borrowed value objects would cause.
#[derive(Clone, Debug)]
enum OwnedTarget {
    Branch(String),
    Commit(String),
}

impl OwnedTarget {
    /// Validates exactly one well-formed target is present.
    fn new(branch_name: Option<String>, commit_sha: Option<String>) -> Result<Self, AppError> {
        match (branch_name, commit_sha) {
            (Some(branch), None) => Ok(Self::Branch(BranchName::new(branch)?.as_str().to_string())),
            (None, Some(sha)) => Ok(Self::Commit(CommitSha::new(sha)?.as_str().to_string())),
            _ => Err(AppError::new(
                "A diff target requires exactly one of branchName or commitSha".to_string(),
                "invalid_diff_target",
                None,
            )),
        }
    }

    fn as_diff_target(&self) -> DiffTarget<'_> {
        match self {
            Self::Branch(name) => DiffTarget::Branch(name),
            Self::Commit(sha) => DiffTarget::Commit(sha),
        }
    }
}

/// Maps a `spawn_blocking` join failure (panic/cancellation) to an `AppError`.
fn join_error(e: tokio::task::JoinError) -> AppError {
    AppError::new(
        "Diff explanation failed".to_string(),
        "agent_failed",
        Some(e.to_string()),
    )
}

fn cancelled_error() -> AppError {
    AppError::new(
        "Explanation cancelled".to_string(),
        "explanation_cancelled",
        None,
    )
}

// --- create_file_explanation ------------------------------------------------

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateFileExplanationInput {
    /// Caller-chosen id used to correlate streamed chunks and to cancel.
    pub request_id: String,
    /// Filesystem path to the repository.
    pub path: String,
    #[serde(default)]
    pub branch_name: Option<String>,
    #[serde(default)]
    pub commit_sha: Option<String>,
    /// Path of the file to explain (as returned by `list_changed_files`).
    pub file_path: String,
    /// Rename source path — pass `ChangedFile.old_path` through for renames.
    #[serde(default)]
    pub old_path: Option<String>,
    /// Reviewer-chosen explanation shape; defaults to succinct.
    #[serde(default)]
    pub style: ExplanationStyle,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateFileExplanationOutput {
    pub request_id: String,
    pub file_path: String,
    /// The full accumulated explanation text.
    pub text: String,
}

/// Explains a single changed file: builds its unified diff, runs the agent,
/// streams `ExplanationChunkEvent`s, and returns the full text.
#[tauri::command(async)]
#[specta::specta]
pub async fn create_file_explanation(
    app: AppHandle,
    registry: State<'_, ExplanationRegistry>,
    config: State<'_, AgentConfig>,
    input: CreateFileExplanationInput,
) -> Result<CreateFileExplanationOutput, AppError> {
    let target = OwnedTarget::new(input.branch_name, input.commit_sha)?;

    let diff_text = {
        let target = target.clone();
        let repo_path = input.path.clone();
        let file_path = input.file_path.clone();
        let old_path = input.old_path.clone();
        tokio::task::spawn_blocking(move || {
            application::build_file_diff_text(
                Path::new(&repo_path),
                target.as_diff_target(),
                &file_path,
                old_path.as_deref(),
            )
        })
        .await
        .map_err(join_error)??
    };

    let prompt = config.render_prompt(input.style, &input.file_path, &diff_text);
    let explainer = CliExplainer {
        config: (*config).clone(),
        cwd: PathBuf::from(&input.path),
    };

    let cancel_rx = registry.register(input.request_id.clone());
    let text = run_with_cancel(
        &explainer,
        prompt,
        &app,
        &input.request_id,
        &input.file_path,
        cancel_rx,
    )
    .await;
    registry.deregister(&input.request_id);
    let text = text?;

    Ok(CreateFileExplanationOutput {
        request_id: input.request_id,
        file_path: input.file_path,
        text,
    })
}

/// Runs one explanation, emitting chunk events, and races it against the
/// cancel signal. On cancel the explain future is dropped (killing the child)
/// and `explanation_cancelled` is returned.
async fn run_with_cancel(
    explainer: &CliExplainer,
    prompt: String,
    app: &AppHandle,
    request_id: &str,
    file_path: &str,
    cancel_rx: oneshot::Receiver<()>,
) -> Result<String, AppError> {
    let app_for_sink = app.clone();
    let req_id = request_id.to_string();
    let file = file_path.to_string();
    let sink = move |delta: String| {
        let _ = ExplanationChunkEvent {
            request_id: req_id.clone(),
            file_path: file.clone(),
            delta,
        }
        .emit(&app_for_sink);
    };

    tokio::select! {
        result = application::explain_diff(explainer, prompt, &sink) => result,
        _ = cancel_rx => Err(cancelled_error()),
    }
}

// --- create_hunk_explanation ------------------------------------------------

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateHunkExplanationInput {
    /// Caller-chosen id used to correlate streamed chunks and to cancel.
    pub request_id: String,
    pub path: String,
    #[serde(default)]
    pub branch_name: Option<String>,
    #[serde(default)]
    pub commit_sha: Option<String>,
    pub file_path: String,
    #[serde(default)]
    pub old_path: Option<String>,
    #[serde(default)]
    pub style: ExplanationStyle,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateHunkExplanationOutput {
    pub request_id: String,
    pub file_path: String,
    /// The full marker-delimited text (`@@HUNK n@@` + explanation per hunk).
    pub text: String,
    /// The git header of each hunk, in order — labels the parsed sections.
    pub hunk_headers: Vec<String>,
}

/// Explains a changed file one hunk at a time: the agent echoes a `@@HUNK n@@`
/// marker before each explanation, so the streamed text splits back into
/// per-hunk sections. Files with no textual hunks (binary, pure rename) return
/// immediately without running the agent.
#[tauri::command(async)]
#[specta::specta]
pub async fn create_hunk_explanation(
    app: AppHandle,
    registry: State<'_, ExplanationRegistry>,
    config: State<'_, AgentConfig>,
    input: CreateHunkExplanationInput,
) -> Result<CreateHunkExplanationOutput, AppError> {
    let target = OwnedTarget::new(input.branch_name, input.commit_sha)?;

    let (prompt, hunk_headers) = {
        let target = target.clone();
        let repo_path = input.path.clone();
        let file_path = input.file_path.clone();
        let old_path = input.old_path.clone();
        let style = input.style;
        tokio::task::spawn_blocking(move || {
            application::build_hunk_explanation_request(
                Path::new(&repo_path),
                target.as_diff_target(),
                &file_path,
                old_path.as_deref(),
                style,
            )
        })
        .await
        .map_err(join_error)??
    };

    // Nothing to explain (binary / pure rename): skip the agent entirely.
    if hunk_headers.is_empty() {
        return Ok(CreateHunkExplanationOutput {
            request_id: input.request_id,
            file_path: input.file_path,
            text: String::new(),
            hunk_headers,
        });
    }

    let explainer = CliExplainer {
        config: (*config).clone(),
        cwd: PathBuf::from(&input.path),
    };

    let cancel_rx = registry.register(input.request_id.clone());
    let text = run_with_cancel(
        &explainer,
        prompt,
        &app,
        &input.request_id,
        &input.file_path,
        cancel_rx,
    )
    .await;
    registry.deregister(&input.request_id);
    let text = text?;

    Ok(CreateHunkExplanationOutput {
        request_id: input.request_id,
        file_path: input.file_path,
        text,
        hunk_headers,
    })
}

// --- create_diff_explanation_batch ------------------------------------------

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiffExplanationBatchInput {
    /// Caller-chosen id used to correlate every file's stream and to cancel.
    pub batch_id: String,
    pub path: String,
    #[serde(default)]
    pub branch_name: Option<String>,
    #[serde(default)]
    pub commit_sha: Option<String>,
    /// Files to explain; when omitted the full changed set is derived.
    #[serde(default)]
    pub file_paths: Option<Vec<String>>,
    /// Reviewer-chosen explanation shape; defaults to succinct.
    #[serde(default)]
    pub style: ExplanationStyle,
    /// Whole-file summary vs per-change (inline) explanations; defaults to file.
    #[serde(default)]
    pub detail: ExplanationDetail,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiffExplanationBatchOutput {
    pub batch_id: String,
    /// Number of files processed (completed or failed).
    pub total: u32,
}

/// Explains every changed file (or a named subset) one at a time — agents are
/// effectively single-session, so files run sequentially rather than in
/// parallel. Per file it streams chunks under the `batchId`, emits a
/// completion event, and bumps batch progress. A single file's failure does
/// not abort the batch (its completion event carries `error`).
#[tauri::command(async)]
#[specta::specta]
pub async fn create_diff_explanation_batch(
    app: AppHandle,
    registry: State<'_, ExplanationRegistry>,
    config: State<'_, AgentConfig>,
    input: CreateDiffExplanationBatchInput,
) -> Result<CreateDiffExplanationBatchOutput, AppError> {
    let target = OwnedTarget::new(input.branch_name, input.commit_sha)?;

    // Resolve the file set (named subset, or the whole changeset).
    let files = match input.file_paths {
        Some(files) => files,
        None => {
            let target = target.clone();
            let repo_path = input.path.clone();
            tokio::task::spawn_blocking(move || {
                application::list_target_file_paths(Path::new(&repo_path), target.as_diff_target())
            })
            .await
            .map_err(join_error)??
        }
    };

    let total = u32::try_from(files.len()).unwrap_or(u32::MAX);
    let config = (*config).clone();
    let cancel_rx = registry.register(input.batch_id.clone());

    let params = BatchParams {
        app: &app,
        config: &config,
        style: input.style,
        detail: input.detail,
        repo_path: &input.path,
        target: &target,
        batch_id: &input.batch_id,
        total,
    };
    let outcome = tokio::select! {
        r = run_batch(&params, &files) => r,
        _ = cancel_rx => Err(cancelled_error()),
    };
    registry.deregister(&input.batch_id);
    outcome?;

    Ok(CreateDiffExplanationBatchOutput {
        batch_id: input.batch_id,
        total,
    })
}

/// The invariant context for a batch run — everything but the per-file path.
struct BatchParams<'a> {
    app: &'a AppHandle,
    config: &'a AgentConfig,
    style: ExplanationStyle,
    detail: ExplanationDetail,
    repo_path: &'a str,
    target: &'a OwnedTarget,
    batch_id: &'a str,
    total: u32,
}

/// The batch loop, factored out so the cancel signal can race the whole run.
async fn run_batch(params: &BatchParams<'_>, files: &[String]) -> Result<(), AppError> {
    for (index, file_path) in files.iter().enumerate() {
        // Build the prompt off-thread. `None` means "nothing to explain" — a
        // hunkless file in per-change mode (binary / pure rename) — so the agent
        // is skipped entirely.
        let prompt = {
            let target = params.target.clone();
            let repo_path = params.repo_path.to_string();
            let file_path = file_path.clone();
            let config = params.config.clone();
            let style = params.style;
            let detail = params.detail;
            tokio::task::spawn_blocking(move || -> Result<Option<String>, AppError> {
                let target = target.as_diff_target();
                match detail {
                    ExplanationDetail::File => {
                        let diff_text = application::build_file_diff_text(
                            Path::new(&repo_path),
                            target,
                            &file_path,
                            None,
                        )?;
                        Ok(Some(config.render_prompt(style, &file_path, &diff_text)))
                    }
                    ExplanationDetail::Hunks => {
                        let (prompt, headers) = application::build_hunk_explanation_request(
                            Path::new(&repo_path),
                            target,
                            &file_path,
                            None,
                            style,
                        )?;
                        Ok(if headers.is_empty() {
                            None
                        } else {
                            Some(prompt)
                        })
                    }
                }
            })
            .await
            .map_err(join_error)?
        };

        let completed = match prompt {
            // Nothing to explain (hunkless file in per-change mode): report an
            // empty result without spending agent quota.
            Ok(None) => Ok(String::new()),
            Ok(Some(prompt)) => {
                let explainer = CliExplainer {
                    config: params.config.clone(),
                    cwd: PathBuf::from(params.repo_path),
                };
                let app_for_sink = params.app.clone();
                let batch = params.batch_id.to_string();
                let file = file_path.clone();
                let sink = move |delta: String| {
                    let _ = ExplanationChunkEvent {
                        request_id: batch.clone(),
                        file_path: file.clone(),
                        delta,
                    }
                    .emit(&app_for_sink);
                };
                application::explain_diff(&explainer, prompt, &sink).await
            }
            Err(e) => Err(e),
        };

        let file_event = match completed {
            Ok(text) => ExplanationFileCompletedEvent {
                request_id: params.batch_id.to_string(),
                file_path: file_path.clone(),
                text,
                error: None,
            },
            Err(e) => ExplanationFileCompletedEvent {
                request_id: params.batch_id.to_string(),
                file_path: file_path.clone(),
                text: String::new(),
                error: Some(e.description.unwrap_or(e.message)),
            },
        };
        let _ = file_event.emit(params.app);

        let done = u32::try_from(index + 1).unwrap_or(u32::MAX);
        let _ = ExplanationBatchProgressEvent {
            batch_id: params.batch_id.to_string(),
            done,
            total: params.total,
        }
        .emit(params.app);
    }
    Ok(())
}

// --- cancel_explanation -----------------------------------------------------

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CancelExplanationInput {
    /// The `requestId` or `batchId` to cancel.
    pub id: String,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CancelExplanationOutput {
    /// Whether a matching in-flight explanation was found and signalled.
    pub cancelled: bool,
}

/// Cancels an in-flight single or batch explanation by its id.
#[tauri::command(async)]
#[specta::specta]
pub async fn cancel_explanation(
    registry: State<'_, ExplanationRegistry>,
    input: CancelExplanationInput,
) -> Result<CancelExplanationOutput, AppError> {
    Ok(CancelExplanationOutput {
        cancelled: registry.cancel(&input.id),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validated_target_requires_exactly_one() {
        assert!(OwnedTarget::new(None, None).is_err());
        assert!(OwnedTarget::new(Some("main".into()), Some("abc1234".into())).is_err());
        assert!(OwnedTarget::new(Some("main".into()), None).is_ok());
        assert!(OwnedTarget::new(None, Some("abcdef1".into())).is_ok());
    }

    #[test]
    fn validated_target_maps_to_diff_target() {
        let branch = OwnedTarget::new(Some("feature/x".into()), None).unwrap();
        assert!(matches!(
            branch.as_diff_target(),
            DiffTarget::Branch("feature/x")
        ));

        let commit = OwnedTarget::new(None, Some("abcdef1".into())).unwrap();
        assert!(matches!(
            commit.as_diff_target(),
            DiffTarget::Commit("abcdef1")
        ));
    }

    #[test]
    fn validated_target_rejects_malformed_values() {
        assert_eq!(
            OwnedTarget::new(Some("bad name".into()), None)
                .unwrap_err()
                .kind,
            "invalid_branch_name"
        );
        assert_eq!(
            OwnedTarget::new(None, Some("nope".into()))
                .unwrap_err()
                .kind,
            "invalid_commit_sha"
        );
    }

    #[test]
    fn registry_cancel_fires_only_registered_ids() {
        let registry = ExplanationRegistry::default();
        let _rx = registry.register("a".to_string());

        // A live receiver exists, so the signal is delivered.
        assert!(registry.cancel("a"));
        // Second cancel finds nothing (already removed).
        assert!(!registry.cancel("a"));
        // Unknown id: nothing to cancel.
        assert!(!registry.cancel("missing"));
    }

    #[test]
    fn registry_cancel_reports_false_when_receiver_dropped() {
        let registry = ExplanationRegistry::default();
        let rx = registry.register("b".to_string());
        drop(rx); // receiver gone: send fails, so cancel reports false.
        assert!(!registry.cancel("b"));
    }

    #[test]
    fn registry_deregister_prevents_later_cancel() {
        let registry = ExplanationRegistry::default();
        let _rx = registry.register("c".to_string());
        registry.deregister("c");
        assert!(!registry.cancel("c"));
    }

    #[tokio::test]
    async fn cancel_explanation_command_reports_no_match() {
        let registry = ExplanationRegistry::default();
        // Exercised directly (no receiver registered) — returns cancelled=false.
        assert!(!registry.cancel("nope"));
    }
}

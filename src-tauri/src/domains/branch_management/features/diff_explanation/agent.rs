//! Infrastructure: the `Explainer` port and its `CliExplainer` adapter.
//!
//! The application layer depends only on `&dyn Explainer`, so it is testable
//! without spawning a process. `CliExplainer` runs the configured binary with
//! `tokio::process`, feeds it the prompt over stdin, and streams stdout back
//! through `sink` — parsing each line per the configured output format. Raw
//! `tokio::process` runs in the trusted Rust backend, so this needs no
//! `tauri-plugin-shell` capability.

use std::path::PathBuf;
use std::process::Stdio;
use std::time::{Duration, Instant};

use serde_json::Value;
use tokio::io::{AsyncBufRead, AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use super::models::{AgentConfig, AgentOutputFormat};
use crate::shared::error::AppError;

/// Deltas are buffered and flushed at most this often, so a long explanation
/// fires a handful of events instead of one per token. Mirrors the cleanup
/// scan's `PROGRESS_THROTTLE`.
const DELTA_THROTTLE: Duration = Duration::from_millis(60);

/// Streams an explanation for a single diff. Each text delta is handed to
/// `sink`; the full accumulated text is returned.
#[async_trait::async_trait]
pub trait Explainer: Send + Sync {
    /// `sink` receives each (coalesced) text delta by value — owned so the
    /// callback can move it straight into an event payload without borrowing
    /// the reader's buffer.
    async fn explain(
        &self,
        prompt: String,
        sink: &(dyn Fn(String) + Send + Sync),
    ) -> Result<String, AppError>;
}

/// Runs the configured CLI agent in the repository as its working directory,
/// so the agent inherits the user's ambient credentials and workspace context.
pub struct CliExplainer {
    pub config: AgentConfig,
    /// The repository path — the child's `cwd`.
    pub cwd: PathBuf,
}

#[async_trait::async_trait]
impl Explainer for CliExplainer {
    async fn explain(
        &self,
        prompt: String,
        sink: &(dyn Fn(String) + Send + Sync),
    ) -> Result<String, AppError> {
        if !self.config.is_program_allowed() {
            return Err(AppError::new(
                format!("Agent '{}' is not an allowed program", self.config.program),
                "agent_not_found",
                None,
            ));
        }

        let mut child = Command::new(&self.config.program)
            .args(&self.config.args)
            .current_dir(&self.cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            // If the future is dropped (cancellation), the child is killed.
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| spawn_error(&self.config.program, &e))?;

        // Feed the prompt over stdin on its own task so a large prompt can't
        // deadlock against stdout back-pressure; dropping the writer closes it.
        if let Some(mut stdin) = child.stdin.take() {
            tokio::spawn(async move {
                let _ = stdin.write_all(prompt.as_bytes()).await;
                let _ = stdin.shutdown().await;
            });
        }

        // Drain stderr concurrently so it can't fill its pipe and block the
        // child while we read stdout.
        let stderr = child.stderr.take();
        let stderr_task = tokio::spawn(async move {
            let mut buf = String::new();
            if let Some(mut pipe) = stderr {
                let _ = pipe.read_to_string(&mut buf).await;
            }
            buf
        });

        let stdout = child.stdout.take().ok_or_else(|| {
            AppError::new(
                "Agent produced no stdout stream".to_string(),
                "agent_failed",
                None,
            )
        })?;

        let full = read_stream(
            BufReader::new(stdout),
            self.config.output_format,
            DELTA_THROTTLE,
            sink,
        )
        .await?;

        let status = child.wait().await.map_err(|e| {
            AppError::new(
                "Failed to wait for agent process".to_string(),
                "agent_failed",
                Some(e.to_string()),
            )
        })?;

        if !status.success() {
            let stderr = stderr_task.await.unwrap_or_default();
            return Err(AppError::new(
                format!("Agent '{}' exited with a failure", self.config.program),
                "agent_failed",
                Some(if stderr.trim().is_empty() {
                    format!("exit status: {status}")
                } else {
                    stderr
                }),
            ));
        }

        Ok(full)
    }
}

/// Maps a spawn `io::Error` to a stable error kind: a missing binary is
/// `agent_not_found`; anything else is `agent_failed`.
fn spawn_error(program: &str, e: &std::io::Error) -> AppError {
    if e.kind() == std::io::ErrorKind::NotFound {
        AppError::new(
            format!("Agent '{program}' was not found on PATH"),
            "agent_not_found",
            Some(e.to_string()),
        )
    } else {
        AppError::new(
            format!("Failed to start agent '{program}'"),
            "agent_failed",
            Some(e.to_string()),
        )
    }
}

/// Reads an agent's output line by line, extracting text deltas per `format`,
/// coalescing them on a `throttle` timer before handing each batch to `sink`,
/// and returning the full accumulated text. Generic over the reader so it can
/// be driven from an in-memory buffer in tests — no process required.
async fn read_stream<R>(
    reader: R,
    format: AgentOutputFormat,
    throttle: Duration,
    sink: &(dyn Fn(String) + Send + Sync),
) -> Result<String, AppError>
where
    R: AsyncBufRead + Unpin,
{
    let mut lines = reader.lines();
    let mut full = String::new();
    let mut pending = String::new();
    let mut last_flush = Instant::now();

    while let Some(line) = lines.next_line().await.map_err(|e| {
        AppError::new(
            "Failed to read agent output".to_string(),
            "agent_failed",
            Some(e.to_string()),
        )
    })? {
        if let Some(delta) = parse_line(format, &line) {
            full.push_str(&delta);
            pending.push_str(&delta);
            if last_flush.elapsed() >= throttle {
                sink(std::mem::take(&mut pending));
                last_flush = Instant::now();
            }
        }
    }

    if !pending.is_empty() {
        sink(pending);
    }
    Ok(full)
}

/// Extracts the text delta from one output line, or `None` for lines that
/// carry no explanation text (control events, blank lines, unparsable JSON).
fn parse_line(format: AgentOutputFormat, line: &str) -> Option<String> {
    match format {
        AgentOutputFormat::PlainText => {
            if line.is_empty() {
                None
            } else {
                // Re-add the newline the line reader stripped, so paragraph
                // breaks survive.
                Some(format!("{line}\n"))
            }
        }
        AgentOutputFormat::StreamJson => {
            let value: Value = serde_json::from_str(line).ok()?;
            extract_delta(&value)
        }
    }
}

/// Pulls assistant text out of a stream-json event, tolerating the shapes
/// Claude Code emits: streaming `content_block_delta` (`delta.text`), a full
/// `assistant` message (`message.content[].text`), or a bare `text` field.
fn extract_delta(value: &Value) -> Option<String> {
    if let Some(text) = value
        .get("delta")
        .and_then(|d| d.get("text"))
        .and_then(Value::as_str)
    {
        return Some(text.to_string());
    }

    if let Some(content) = value
        .get("message")
        .and_then(|m| m.get("content"))
        .and_then(Value::as_array)
    {
        let mut out = String::new();
        for block in content {
            if let Some(text) = block.get("text").and_then(Value::as_str) {
                out.push_str(text);
            }
        }
        if !out.is_empty() {
            return Some(out);
        }
    }

    value
        .get("text")
        .and_then(Value::as_str)
        .map(str::to_string)
}

#[cfg(test)]
pub(crate) mod test_support {
    use super::*;
    use std::sync::Mutex;

    /// Scripted `Explainer` for application-layer tests: emits the given deltas
    /// in order (no process, no Tauri runtime), then returns their concatenation
    /// — or a preset error.
    pub struct FakeExplainer {
        pub deltas: Vec<String>,
        pub error: Option<AppError>,
    }

    impl FakeExplainer {
        pub fn scripted(deltas: &[&str]) -> Self {
            Self {
                deltas: deltas.iter().map(|d| (*d).to_string()).collect(),
                error: None,
            }
        }

        pub fn failing(error: AppError) -> Self {
            Self {
                deltas: Vec::new(),
                error: Some(error),
            }
        }
    }

    #[async_trait::async_trait]
    impl Explainer for FakeExplainer {
        async fn explain(
            &self,
            _prompt: String,
            sink: &(dyn Fn(String) + Send + Sync),
        ) -> Result<String, AppError> {
            if let Some(err) = &self.error {
                return Err(AppError::new(
                    err.message.clone(),
                    &err.kind,
                    err.description.clone(),
                ));
            }
            let mut full = String::new();
            for delta in &self.deltas {
                sink(delta.clone());
                full.push_str(delta);
            }
            Ok(full)
        }
    }

    /// Test sink that records every delta it receives.
    #[derive(Default)]
    pub struct RecordingSink {
        pub chunks: Mutex<Vec<String>>,
    }

    impl RecordingSink {
        pub fn push(&self, delta: String) {
            self.chunks.lock().unwrap().push(delta);
        }
        pub fn joined(&self) -> String {
            self.chunks.lock().unwrap().concat()
        }
        pub fn count(&self) -> usize {
            self.chunks.lock().unwrap().len()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::{FakeExplainer, RecordingSink};
    use super::*;

    fn cursor(text: &str) -> BufReader<std::io::Cursor<Vec<u8>>> {
        BufReader::new(std::io::Cursor::new(text.as_bytes().to_vec()))
    }

    #[test]
    fn parse_line_plaintext_keeps_content_drops_blanks() {
        assert_eq!(
            parse_line(AgentOutputFormat::PlainText, "hello"),
            Some("hello\n".to_string())
        );
        assert_eq!(parse_line(AgentOutputFormat::PlainText, ""), None);
    }

    #[test]
    fn parse_line_stream_json_ignores_non_json_and_textless_events() {
        assert_eq!(parse_line(AgentOutputFormat::StreamJson, "not json"), None);
        assert_eq!(
            parse_line(AgentOutputFormat::StreamJson, r#"{"type":"result"}"#),
            None
        );
    }

    #[test]
    fn extract_delta_reads_every_supported_shape() {
        // content_block_delta
        let v: Value = serde_json::from_str(r#"{"delta":{"text":"ab"}}"#).unwrap();
        assert_eq!(extract_delta(&v), Some("ab".to_string()));

        // assistant message with multiple text blocks
        let v: Value = serde_json::from_str(
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"x"},{"type":"text","text":"y"}]}}"#,
        )
        .unwrap();
        assert_eq!(extract_delta(&v), Some("xy".to_string()));

        // bare text
        let v: Value = serde_json::from_str(r#"{"text":"z"}"#).unwrap();
        assert_eq!(extract_delta(&v), Some("z".to_string()));

        // message with only non-text blocks yields nothing
        let v: Value =
            serde_json::from_str(r#"{"message":{"content":[{"type":"tool_use"}]}}"#).unwrap();
        assert_eq!(extract_delta(&v), None);

        // no recognizable field
        let v: Value = serde_json::from_str(r#"{"foo":1}"#).unwrap();
        assert_eq!(extract_delta(&v), None);
    }

    #[tokio::test]
    async fn read_stream_zero_throttle_flushes_every_delta() {
        let sink = RecordingSink::default();
        let input = "{\"delta\":{\"text\":\"a\"}}\n{\"delta\":{\"text\":\"b\"}}\nnot-json\n";
        let full = read_stream(
            cursor(input),
            AgentOutputFormat::StreamJson,
            Duration::ZERO,
            &|d| sink.push(d),
        )
        .await
        .unwrap();

        assert_eq!(full, "ab");
        // One flush per parsed delta (non-json line contributes nothing).
        assert_eq!(sink.count(), 2);
        assert_eq!(sink.joined(), "ab");
    }

    #[tokio::test]
    async fn read_stream_large_throttle_coalesces_into_one_flush() {
        let sink = RecordingSink::default();
        let input = "one\ntwo\nthree\n";
        let full = read_stream(
            cursor(input),
            AgentOutputFormat::PlainText,
            Duration::from_secs(3600),
            &|d| sink.push(d),
        )
        .await
        .unwrap();

        assert_eq!(full, "one\ntwo\nthree\n");
        // Nothing flushed mid-loop; a single trailing flush carries it all.
        assert_eq!(sink.count(), 1);
        assert_eq!(sink.joined(), "one\ntwo\nthree\n");
    }

    #[tokio::test]
    async fn read_stream_with_no_text_never_calls_sink() {
        let sink = RecordingSink::default();
        let full = read_stream(
            cursor("\n\n"),
            AgentOutputFormat::PlainText,
            Duration::ZERO,
            &|d| sink.push(d),
        )
        .await
        .unwrap();
        assert_eq!(full, "");
        assert_eq!(sink.count(), 0);
    }

    #[tokio::test]
    async fn cli_explainer_rejects_disallowed_program() {
        let explainer = CliExplainer {
            config: AgentConfig {
                program: "sh".to_string(),
                ..AgentConfig::default()
            },
            cwd: PathBuf::from("."),
        };
        let err = explainer
            .explain("hi".to_string(), &|_| {})
            .await
            .unwrap_err();
        assert_eq!(err.kind, "agent_not_found");
    }

    #[tokio::test]
    async fn fake_explainer_streams_scripted_deltas() {
        let sink = RecordingSink::default();
        let explainer = FakeExplainer::scripted(&["Hel", "lo"]);
        let full = explainer
            .explain("prompt".to_string(), &|d| sink.push(d))
            .await
            .unwrap();
        assert_eq!(full, "Hello");
        assert_eq!(sink.joined(), "Hello");
    }

    #[tokio::test]
    async fn fake_explainer_surfaces_preset_error() {
        let explainer =
            FakeExplainer::failing(AppError::new("boom".to_string(), "agent_failed", None));
        let err = explainer
            .explain("prompt".to_string(), &|_| {})
            .await
            .unwrap_err();
        assert_eq!(err.kind, "agent_failed");
    }

    #[tokio::test]
    async fn spawn_error_maps_missing_binary_to_agent_not_found() {
        let not_found = std::io::Error::new(std::io::ErrorKind::NotFound, "nope");
        assert_eq!(spawn_error("claude", &not_found).kind, "agent_not_found");

        let other = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        assert_eq!(spawn_error("claude", &other).kind, "agent_failed");
    }
}

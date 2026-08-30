# Technical Spec: AI Diff Explanations via a Local CLI Agent

## 1. Summary

Add AI-generated, per-file explanations of a diff to the branch-diff view, powered
by a **local CLI agent** (Claude Code, `gemini`, `gcloud`, …) rather than a paid
API call from the app. Explanations stream into the UI token-by-token as the agent
produces them.

The original external spec assumed a _browser_ app and therefore invented a
Node/Python **Local Bridge Daemon** talking over WebSocket, plus a command
whitelist as its security boundary. **Cut Branches is a Tauri app, so that entire
tier is unnecessary.** The Rust backend _is_ the bridge: it spawns the child
process, streams its output, and pushes typed events into the webview — with no
localhost port, no CORS/mixed-content problem, and structural permissioning via
Tauri capabilities.

## 2. What replaces the original architecture

| Original spec component        | Cut Branches equivalent                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| Local Bridge Daemon (Node/Py)  | Rust command in a feature slice (`#[tauri::command(async)]`)        |
| WebSocket / SSE stream         | `tauri-specta` typed `Event` (`.emit(&app)` → frontend `listen()`)  |
| `child_process.spawn` + stdout | `tokio::process::Command` + `AsyncBufReadExt` line reader           |
| Command whitelist (security)   | Agent config is app-controlled + Tauri `capabilities/migrated.json` |
| Cancellation (SIGTERM)         | Managed-state registry of child handles + `cancel_explanation`      |
| "Free — no paid API"           | **Not free** — shifts billing to the agent's subscription/quota     |

Note: raw `tokio::process` runs in the _trusted_ Rust backend, so it needs **no**
`tauri-plugin-shell` JS capability. The shell plugin is only relevant if we spawned
from JS — we won't.

## 3. Design decisions (confirmed)

- **Agent-agnostic (Ports & Adapters).** The feature defines an `Explainer` _port_;
  a `CliExplainer` _adapter_ runs the configured binary. Swapping Claude Code for
  `gemini`/`gcloud` is a config change, not a code change.
- **Both granularities.** On-demand per file (click a file in the diff/canvas) _and_
  a "Generate all" batch that queues every changed file through the same pipeline.

## 4. Backend (`src-tauri`)

New feature slice, sibling to `branch_diff` / `code_structure`:

```
src-tauri/src/domains/branch_management/features/diff_explanation/
├── mod.rs          # pub use of commands; slice doc
├── commands.rs     # delivery: create_file_explanation, create_diff_explanation_batch, cancel_explanation
├── application.rs  # orchestration: build prompt from diff, drive the Explainer
├── agent.rs        # infrastructure: Explainer port + CliExplainer adapter (tokio::process)
├── models.rs       # domain: AgentConfig, ExplanationRequest, AgentOutputFormat
└── events.rs       # ExplanationChunkEvent, ExplanationFileCompletedEvent, ExplanationBatchProgressEvent
```

### 4.1 The port (dependency inversion → testable without spawning)

```rust
// agent.rs
#[async_trait::async_trait]
pub trait Explainer: Send + Sync {
    /// Streams explanation text for a single diff. Each delta is handed to `sink`.
    async fn explain(
        &self,
        prompt: String,
        sink: &(dyn Fn(&str) + Send + Sync),
    ) -> Result<String, AppError>; // returns the full accumulated text
}
```

The application layer depends only on `&dyn Explainer`. Unit tests inject a
`FakeExplainer` that emits scripted deltas — no process, no Tauri runtime.

### 4.2 The CLI adapter

```rust
pub struct CliExplainer {
    pub config: AgentConfig,
    pub cwd: PathBuf, // the repository path — gives the agent workspace context
}
```

- Spawns with `tokio::process::Command`, `stdin` = prompt (or arg), `stdout` piped.
- Reads `stdout` with `BufReader::lines()` and, per `config.output_format`:
  - `StreamJson` → parse each line as a JSON event, extract the text delta
    (the robust path — Claude Code's `--output-format stream-json` is designed
    for exactly this; **no TUI/ANSI parsing**).
  - `PlainText` → treat each line as a delta (fallback for simpler agents).
- On non-zero exit → `AppError { kind: "agent_failed", .. }` carrying `stderr`.
- Coalesce deltas on a light timer (mirror the cleanup scan's `PROGRESS_THROTTLE`,
  ~50–80ms) so we don't flood the event channel with one event per token.

### 4.3 Config (pluggable, app-controlled)

```rust
pub struct AgentConfig {
    pub program: String,           // "claude"
    pub args: Vec<String>,         // ["-p", "--output-format", "stream-json", ...]
    pub output_format: AgentOutputFormat, // StreamJson | PlainText
    pub prompt_template: String,   // contains "{diff}" and "{path}" placeholders
}
```

Baked-in default targets Claude Code; held in `.manage(AgentConfig::default())`
(same pattern as `HistoryCache` at `main.rs:200`). A settings command to override
it can come later — out of scope for v1. Validate `program` against a small
allowlist before spawning.

### 4.4 Commands

```rust
#[tauri::command(async)]
#[specta::specta]
async fn create_file_explanation(
    app: tauri::AppHandle,
    registry: tauri::State<'_, ExplanationRegistry>,
    config: tauri::State<'_, AgentConfig>,
    input: CreateFileExplanationInput, // { requestId, path, branchName?, commitSha?, filePath }
) -> Result<CreateFileExplanationOutput, AppError>;
```

Flow:

1. Validate target via the existing `ValidatedTarget` value-object pattern
   (`branch_diff/commands.rs:29`).
2. Compute the unified diff for `filePath` by **reusing `branch_diff::git`**
   (`build_diff` / `get_file_diff`). We feed the diff text into the prompt rather
   than relying on the agent to read files itself — deterministic and works for
   _any_ agent.
3. Register a cancellation handle in `ExplanationRegistry` keyed by `requestId`.
4. Run `CliExplainer::explain`, whose `sink` emits
   `ExplanationChunkEvent { requestId, filePath, delta }.emit(&app)`.
5. Return `{ requestId, filePath, text }`; deregister the handle.

`create_diff_explanation_batch(app, registry, config, input)`:

- `input = { batchId, path, target, filePaths? }`. If `filePaths` is omitted, derive
  the full changed set via `list_changed_files` (or reuse `code_structure`'s output).
- Process through a **bounded queue** (worker pool size 1–2; agents are effectively
  single-session — this resolves the concurrency concern up front).
- Per file emit `ExplanationChunkEvent` + `ExplanationFileCompletedEvent`, and
  `ExplanationBatchProgressEvent { batchId, done, total }`.
- Cancellation via the same registry keyed by `batchId`.

`cancel_explanation(registry, input: { id })` → looks up the child/`CancellationToken`
and kills it; adapter surfaces `AppError { kind: "explanation_cancelled" }`.

### 4.5 Events (`events.rs`)

Typed `tauri-specta` events, kebab `NAME`, registered in `collect_events![...]`
in `main.rs` (regenerates `bindings.ts` on the debug build):

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplanationChunkEvent { pub request_id: String, pub file_path: String, pub delta: String }
impl Event for ExplanationChunkEvent { const NAME: &'static str = "explanation-chunk"; }
// + ExplanationFileCompletedEvent, ExplanationBatchProgressEvent
```

### 4.6 Registration (`main.rs`)

- Add the three commands to `collect_commands![...]` (`main.rs:97`).
- Add the events to `collect_events![...]` (`main.rs:148`).
- `.manage(ExplanationRegistry::default())` and `.manage(AgentConfig::default())`.

### 4.7 Errors

Return `AppError` with stable `kind`s the frontend can branch on:
`agent_not_found`, `agent_failed`, `explanation_cancelled`, `invalid_diff_target`.
Frontend reads `error.description ?? error.message` (existing convention).

## 5. Frontend (`src`)

New sibling feature slice `diff-explanation` (consumes branch-diff's changed-file
list — same-domain, allowed):

```
src/domains/branch-management/features/diff-explanation/
├── infrastructure/mutations/
│   ├── create-file-explanation-mutation.ts        # createTauriMutation('createFileExplanation', …)
│   └── create-diff-explanation-batch-mutation.ts
├── application/
│   ├── use-file-explanation.svelte.ts             # single-file composable
│   └── use-diff-explanation-batch.svelte.ts       # batch composable + per-file state map
└── components/
    ├── explanation-panel.svelte                   # renders streaming text (in file-node / row)
    └── __tests__/
```

### 5.1 Composable (template: `use-cleanup-targets.svelte.ts`)

```ts
// use-file-explanation.svelte.ts
let text = $state('');
let isStreaming = $state(false);
const requestId = crypto.randomUUID();

async function explain(filePath: string) {
	let unlisten: UnlistenFn | undefined;
	try {
		unlisten = await listen<ExplanationChunkEvent>('explanation-chunk', (e) => {
			if (e.payload.requestId === requestId && e.payload.filePath === filePath)
				text += e.payload.delta;
		});
	} catch {
		/* not in a Tauri runtime (tests) */
	}
	isStreaming = true;
	try {
		await mutation.mutateAsync({ requestId, path, branchName, commitSha, filePath });
	} finally {
		isStreaming = false;
		unlisten?.();
	}
}
```

State exposed via runes getters; `cancel()` calls the `cancelExplanation` command
with `requestId`. Batch composable is the same shape keyed by `batchId`, holding a
`Map<filePath, { text, status }>` plus a `{ done, total }` progress derived from
`ExplanationBatchProgressEvent`.

### 5.2 UI wiring

- Per-file: an "Explain" affordance on `file-node.svelte` (canvas) and
  `changed-file-row.svelte` (list); expands `explanation-panel.svelte`.
- Batch: a "Generate explanations" button in `branch-diff-view.svelte` that runs
  the batch composable and lets each panel fill in as its file completes.

## 6. The gotchas this design already handles

1. **TUI/ANSI garbage** — solved by requiring a headless structured-output mode
   (`StreamJson`); `PlainText` is the degraded fallback, never the interactive UI.
2. **Concurrency** — bounded queue in the batch command; never N parallel spawns.
3. **Workspace/auth context** — child `cwd` = repo path; the spawn inherits the
   user's environment, so ambient agent credentials carry over. Verify per agent.
4. **Cost transparency** — surface in the UI that this uses the agent's quota; it
   is not free, just billed elsewhere.
5. **Mixed-content / CORS / localhost** — non-issues; there is no browser↔daemon hop.

## 7. Testing

- **Rust unit** — output parsing (`StreamJson` and `PlainText` → deltas) and
  application orchestration against a `FakeExplainer` port. No spawning, no runtime.
- **Rust integration** — one test spawning a tiny fixture script that emits known
  JSON lines, asserting emitted events (guarded so it's skippable in CI without the
  agent binary).
- **Frontend** — composable tests with mocked `listen`/mutation (the try/catch
  around `listen` already tolerates the no-Tauri test env); 100% branch coverage.

## 8. Open questions

- Default agent binary + exact `stream-json` arg set to ship in `AgentConfig`.
- Prompt template wording (how much surrounding context beyond the raw diff).
- Whether v1 exposes agent config in settings or hard-codes it.
- Persist/cache explanations per (target, file, diff hash) to avoid re-running? Could
  reuse the `HistoryCache`-style managed-state pattern.

```

```

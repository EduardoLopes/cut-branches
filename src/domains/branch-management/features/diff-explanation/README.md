# diff-explanation

AI-generated, per-file explanations of a diff, streamed into the review view by
a **local CLI agent** (Claude Code by default) rather than a paid API call.

A sibling feature slice of `branch-diff` / `code-structure` within the
`branch-management` domain. It consumes `branch-diff`'s changed-file list
(same-domain, allowed) and adds a streaming explanation surface on top.

## How it works

The Rust backend _is_ the bridge (Cut Branches is a Tauri app): it spawns the
configured agent with `tokio::process`, feeds it a deterministic unified diff
over stdin, and streams the agent's stdout back into the webview as typed
`explanation-*` events. No localhost port, no WebSocket, no
`tauri-plugin-shell` capability — the spawn is trusted Rust. See
`src-tauri/.../features/diff_explanation/` for the port/adapter, commands, and
cancellation registry.

## Structure

- `infrastructure/mutations/` — server-state adapters (§1.2): `createFileExplanation`,
  `createDiffExplanationBatch`, `cancelExplanation`.
- `application/` — the composables that consume the adapters and multiplex the
  streamed events:
  - `use-file-explanation.svelte.ts` — one file, on demand.
  - `use-diff-explanation-batch.svelte.ts` — the "Explain all" batch, keyed by a
    single `batchId`, exposing a per-file state map and `{ done, total }`.
- `components/explanation-panel.svelte` — presentational: renders streamed text
  and the Explain / Cancel affordances. The parent owns the composable.

## Cost

Explanations run the user's configured local agent and use **its** quota — not
free, just billed elsewhere. The UI makes this explicit ("Uses your agent's
quota").

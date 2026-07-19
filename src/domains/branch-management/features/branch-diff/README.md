# Branch diff

Diff review feature: the changed files of a **branch** (diffed against its
merge-base with HEAD — the same baseline as the `+/-` stats badges on branch
cards) or of a **single commit** (diffed against its first parent), rendered
as an expandable file list with syntax-highlighted hunks.

Gated behind the `branch-diff` feature flag. Entry points: the diff link on
branch cards (branches view) and on commit rows (history view), both deep-
linking into `/repos/[id]/diff?branch=<name>` / `?commit=<sha>`.

## Structure

- `views/branch-diff-view.svelte` — page-level view: header (target badge,
  totals), changed-files list.
- `components/changed-file-row.svelte` — one file: status badge, path,
  per-file `+/-` stats, inline disclosure of the diff.
- `components/file-diff-panel.svelte` — the data side of the expanded diff:
  fetches the file's hunks and the hidden-context lines (`getFileLines`) and
  feeds them to the shared diff viewer.
- `infrastructure/queries/` — TanStack Query adapters over the
  `listChangedFiles` / `getFileDiff` Tauri commands.
- `models/diff-language.ts` — file path → shiki language id.

All rendering (layouts, variants, gutters, highlighting, gap expanders)
lives in the global `src/ui/patterns/diff-viewer/` pattern, which this
feature consumes.

Backend counterpart: `src-tauri/src/domains/branch_management/features/branch_diff/`.

## Future direction

This is phase 1 of a code-review surface. Planned next: a graph of
file/function connections across the diff.

# worktree-management

Manage a repository's **git worktrees** — list, add, remove/prune, and lock/unlock — from the per-repository view.

Ships behind the `worktree-management` feature flag (`src/lib/feature-flags.svelte.ts`, `defaultEnabled: false`). The view is composed into `src/routes/repos/[id]/+page.svelte` at the route level so no domain imports another (§1.3, §4).

## Layout

- `core/models/` — `Worktree` domain model, `WorktreePath` value object, and `converters.ts` (wire DTO ↔ domain).
- `core/composables/` — application logic (`.svelte.ts`):
  - `use-worktrees-view` — consumes the list query, exposes UI-shaped state.
  - `use-add-worktree-flow` — native folder picker + add mutation + toasts.
  - `use-worktree-actions` — remove/lock/unlock mutations + toasts.
- `infrastructure/queries|mutations/` — thin adapters over `createTauriQuery` / `createTauriMutation` (§1.2). The list query maps DTOs → domain models via `WorktreeConverters` in `select`.
- `components/` — `worktree-list` (left-rail selection + lock/unlock), `worktree-row` (info card), `delete-worktrees-modal` (bulk delete). `add-worktree-modal` exists but worktree creation is currently hidden.
- `views/worktrees-view.svelte` — the flag-gated entry point.

## Backend

Talks to the Rust `worktree_management` domain (`src-tauri/src/domains/worktree_management/`) via the generated commands `listWorktrees`, `addWorktree`, `removeWorktree`, `lockWorktree`, `unlockWorktree`.

Cache invalidation for the `add`/`remove`/`lock`/`unlock` mutations is wired through `RESOURCE_MAPPINGS` in `src/infrastructure/query-key-utils.ts` (those verbs aren't recognized by the automatic resource extractor).

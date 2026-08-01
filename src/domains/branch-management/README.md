# Branch Management Domain

## Overview

Manages the Git branch lifecycle: viewing active/deleted branches, selecting them
(individually or all), deleting, restoring (with conflict resolution), locking/unlocking,
switching the current branch, and searching/filtering.

## Business Rules

### Selection

1. The current branch cannot be selected or deleted
2. Locked branches cannot be selected or deleted
3. Selection state is isolated per repository, and separate for active vs. deleted views

### Deletion

1. Cannot delete the current or locked branches
2. Merge-status warnings surface for unmerged branches
3. Batch deletion with transaction-like behavior; deletes are soft (restorable)

### Locking

1. Locked branches cannot be selected or deleted
2. Lock status persists across sessions; locking a branch deselects it

### Restoration

1. Only deleted branches can be restored; name conflicts require Skip/Overwrite
2. Batch restoration is supported, with live progress

## Structure

```
branch-management/
├── views/                       # Delivery — top-level pages (mounted by routes)
│   ├── active-branches-view.svelte
│   └── deleted-branches-view.svelte
├── components/                  # Delivery — feature UI
│   ├── branch-list.svelte · branch-alerts.svelte · lock-branch-toggle.svelte
│   ├── branch-selection.svelte · branch-context-filter.svelte · branch-search.svelte
│   ├── branch-list-empty-state.svelte
│   ├── delete-branch-modal.svelte
│   └── restore-deleted-branch-modal.svelte · restore-branch-status-card.svelte
│       · restore-conflict-prompt.svelte · restore-progress-bar.svelte
├── core/
│   ├── models/                  # Domain — Value Objects & entities (pure)
│   │   ├── branch.ts · branch-name.ts · commit.ts
│   │   ├── branch-constants.ts   # protected / offensive name lists (domain vocabulary)
│   │   └── converters.ts         # DTO <-> domain translation
│   └── composables/             # Application — consuming hooks, runes stores, query/mutation wrappers
│       ├── use-active-branches-view · use-deleted-branches-view · use-branch-selection
│       ├── use-restore-flow · use-restoration-progress · use-prune-orphaned-search-keys
│       ├── search-branches.svelte.ts · deleted-branches.svelte.ts   (runes stores)
│       └── create-*-query.ts / create-*-mutation.ts                 (TanStack wrappers)
└── utils/                       # Pure helpers (filtering, formatting, selection math)
```

Dependency flow: `views/ → layouts/ + components/ → core/composables/ → core/models/`. The
query/mutation wrappers call the global transport (`$utils/create-tauri-query` /
`create-tauri-mutation` over `$infrastructure/bindings`).

## Domain models (`core/models/`)

- `BranchName` — Value Object; validates git ref-name rules in its constructor; exposes
  `isProtected()` / `isPotentiallyOffensive()` (using `branch-constants.ts`).
- `Branch` — entity; immutable, copy-on-change (`withSelection`, `withLock`); identity by name.
- `Commit` — Value Object; composes the shared-kernel `CommitSha` / `Email` from `$core/`.
- `converters.ts` — the DTO boundary translating `$infrastructure/bindings` shapes to models.

## Inter-Domain Communication

No direct domain-to-domain imports (§1.3). Repository data this domain needs (e.g. path,
current branch) is fetched through its own query wrappers over the global transport, and
cross-domain refresh happens through the shared TanStack Query cache — not an event bus.

## State

- **Server state** (TanStack Query): branch lists, repository info, locked branches, merge
  status. Selection is server-persisted (via `updateBranchSelectionBatch`).
- **UI state** (runes stores in `core/composables/`): per-repository search query
  (`search-branches`) and deleted-branch tracking (`deleted-branches`).

## Testing

Co-located `__tests__/` for models, composables, utils, and components; 100% branch coverage.

## Known cleanup opportunities (deferred)

- **§1.6 naming** on the query/mutation wrappers (e.g. `create-get-branches-query` →
  `list`, `create-branch-merge-status-query` missing a verb, `batch` → `bulk`).
- **Test-only cruft**: `create-selected-branches-query`, `create-deleted-selected-branches-query`,
  `locked-branches.svelte.ts`, `selected-branches.svelte.ts` have no production importer
  (selection moved server-side); removing them means adjusting their tests.
- **DTO boundary** is duplicated: `branch.ts`/`commit.ts` embed `fromData`/`toData` while
  `converters.ts` also does — could consolidate to keep entities free of transport types.
- `utils/branch-utils.ts` imports Panda CSS and re-implements `Branch.getColorPalette()` /
  `getAlerts()` — presentation logic that belongs on the entity or a delivery helper.

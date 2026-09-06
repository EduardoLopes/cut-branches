# commit-history (internal feature)

The commit-history / branch-graph feature: a paginated commit log, an 8-lane commit graph,
ahead/behind branch comparison, and the hover preview shown on the branch list.

## Why this is a `features/` folder and not its own domain

This is an **internal feature slice of `branch-management`**, per the code-design guide's §1.8
Approach 2 — not a separate top-level domain. Commit-history is bidirectionally coupled to
branch-management and shares its core model:

- It consumes branch-management's `Branch` model, the branches/repository queries, the
  `updateBranchSelectionBatch` mutation, and `DeleteBranchModal` — selecting and cutting branches
  from the graph is the point of the feature.
- Branch-management's own `branch-list.svelte` imports this feature's `CommitGraphPreview` and
  `fetchCommitHistoryWindow` for its hover preview.

Making it a peer domain would violate §1.3 (domains never import each other) or force promoting
`Branch`, selection state, `DeleteBranchModal`, and the branches query into a shared kernel — the
anti-pattern §1.4 warns against. As a `features/` folder, every one of those cross-references is a
legal **intra-domain** import.

## Layout

- `views/` — `commit-history-view.svelte` (delivery entry, mounted by `routes/repos/[id]/history/`)
- `components/` — the virtualized list, rows, graph rail/gutter cells, hover preview, lane colors
- `application/` — `use-commit-history-view`, `use-branch-comparisons` (orchestration/composables)
- `models/` — `commit-graph.ts` (pure graph domain model; `HistoryCommit` is deliberately separate
  from the branch-management `Commit` model)
- `infrastructure/queries/` — the three history/comparison Tauri query adapters

Shared branch-management-core code (`Branch`, branch queries, selection/deletion) stays in the
parent domain's `core/` and `infrastructure/` and is imported via `$domains/branch-management/...`.
Generic helpers used by this feature live in the global layer: `$infrastructure/create-tauri-infinite-query`,
the `$ui/core` cards, `query-key-utils` invalidation policy, and the `graph.*` Panda tokens.

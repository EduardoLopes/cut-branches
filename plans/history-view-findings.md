# Findings report: commit-history + branch-graph spike → production

Companion to `plans/history-view-handoff.md`. Covers what the audit found in the
spike, what was changed, and the measured results.

## 1. Bugs and defects found in the spike

1. **O(n²) paging (backend).** `list_commit_history` paged with `skip`, re-running
   the revwalk from the newest commit on every page — page N cost grew linearly,
   total cost across a full scroll was quadratic. It also rebuilt the full
   ref-decoration map (`refs_by_oid`, every reference in the repo) on every call.
2. **No staleness protection.** A `skip` cursor silently returned wrong windows if
   refs changed between pages (commits could be skipped or duplicated mid-scroll).
3. **O(everything) relayout (frontend).** `const graph = $derived(computeGraph(commits))`
   re-laid-out ALL loaded commits on every 200-commit append and on unrelated state
   changes; cost grew with each page.
4. **Re-render on horizontal pan.** `railScrollX` was Svelte state: every scroll
   event re-rendered every visible row's SVG (path regeneration included).
5. **Eager comparisons.** `list_branch_comparison` computed ahead/behind for every
   local branch up front — expensive on many-branch repos, even when the gutter
   showed a handful.
6. **Collapsed-run lane coloring bug.** A bundle lane was vivid only when local in
   _every_ hidden row, so lanes that were plainly vivid above and below a collapsed
   run rendered grey (reported during verification; fixed with a boundary rule —
   vivid when local at the first or last row the lane appears in).
7. **Architecture violations.** Delivery layer did git2 work directly, ad-hoc
   `AppError` kinds instead of `BranchError`, a parallel `SpikeCommit` DTO, raw
   `invoke()` bypassing bindings + TanStack Query, a 783-line route file mixing
   fetch/layout/UI state, and zero tests.
8. **Unwired deletion**, hand-rolled popover with no keyboard support/anchoring,
   theme-blind hardcoded palette, `@pindoba/svelte-popover` consumed but absent
   from package.json (worked only via local aliases).

## 2. What was built

### Backend (commands → application → infrastructure/git)

- `HistoryCache` session cache (Tauri managed state): one revwalk per repo collects
  the topological `Vec<Oid>` ordering + index + ref decorations; later pages are
  O(limit) lookups. LRU-evicted at 4 repos; ~60–100 B/commit.
- Cursor paging: opaque `"{refs-digest}:{offset}"`. The digest (hash over sorted
  ref tips + HEAD) invalidates both cache and cursors when refs change —
  `history_cursor_stale` tells the frontend to restart cleanly.
- `get_commit_history_window`: locates a sha (short or full) in O(1) against the
  cached ordering; serves both `?commit=` deep-links and the hover preview.
- `list_branch_comparison` now takes explicit `branchNames` (visible rows only).
- New `BranchError` variants (`revwalk_failed`, `history_cursor_stale`,
  `invalid_history_cursor`); date/short-sha helpers dedup'd into
  `infrastructure/git/commit.rs` (three inline copies before).
- 26 new Rust tests (incl. a deterministic multi-branch/merge fixture repo) + an
  `#[ignore]` perf harness (`CUT_BRANCHES_PERF_REPO=… cargo test perf_paging -- --ignored`).

### Frontend (branch-management domain slice)

- `core/models/commit-graph.ts`: pure, theme-free layout model with a **resumable
  builder** — each page laid out exactly once (`append` is O(page)); property-tested
  that any chunked append sequence ≡ one full layout. 100% branch coverage.
- `createTauriInfiniteQuery` (mirrors `createTauriQuery`: resource keys,
  Result unwrapping, `meta.invalidate`) + three adapters keying by `repoId` so the
  filesystem watcher and mutations invalidate history/comparison/window caches
  (`RESOURCE_MAPPINGS` + `matchesRepositoryChange` extended).
- `use-commit-history-view` composable: `$state.raw` rows appended incrementally,
  cache-backed selection bridge (gutter checkboxes drive the SAME selection the
  `DeleteBranchModal` consumes — Delete N is now the real confirm/delete flow),
  deep-link reveal (locate → page-until-loaded → expand collapsed run → scroll +
  transient highlight), staleness banner + reload.
- `use-branch-comparisons`: visible-branch names diffed/debounced into small
  batched requests; results cached by canonical (sorted) name key.
- Components: rail cell (also renders the mini preview at reduced geometry — one
  renderer), run rows, gutter cell (Pindoba Popover for "+N more"), virtualized
  list, view. Horizontal pan writes a `--rail-scroll-x` CSS custom property —
  zero component re-renders; pinned heads clamp via CSS `clamp()`.
- Commit-card integration (no cross-domain imports): generic `historyHref` +
  `hoverPreview` props on `ui/core/commit-card.svelte`, wired from `branch-list`
  with debounced hover prefetch; preview popover anchored via explicit
  `triggerElement` binding.
- Lane palette → Panda semantic tokens (`colors.graph.lane.0–7`, `graph.muted`)
  with light/dark values; SVG strokes are CSS vars, so theme flips recolor without
  re-rendering.
- Commit info compacted into a Pindoba Banner (message + trailing date; sha
  leading the meta line) freeing rail width (260 → 380 px).

## 3. Performance (measured)

Repo: local `pindoba` checkout — 2,255 commits, 29 branches. Debug build.

| Operation                     | Spike                                 | Now                                          |
| ----------------------------- | ------------------------------------- | -------------------------------------------- |
| Page 1 (walk + decorations)   | ~same work, repeated every page       | 42–58 ms, paid once per session              |
| Pages 2–12 (11 × 200 commits) | grows linearly per page (O(n²) total) | 78 ms total (~7 ms/page, flat)               |
| Deep-link locate              | not possible (or O(n) paging)         | O(1) index lookup                            |
| Frontend append of page N     | full relayout of all N×200 commits    | O(200), old rows untouched (identity-stable) |
| Horizontal rail pan           | re-render of every visible row        | 0 re-renders (CSS var)                       |
| Branch comparisons            | all local branches up front           | visible rows only, batched + cached          |

## 4. Deferred (agreed)

- **Reduced graph** (draw only lanes with visible nodes / bundle transit lanes) —
  the ~100-lane "picket fence" is still contained by clip + shared scroll.
- Infinite-query invalidation refetches all loaded pages sequentially after a
  delete; acceptable so far — switch to reset+banner if it measures slow on
  huge histories.
- Cached-ordering memory cap for monorepo-scale repos (commented in
  `infrastructure/git/history.rs`).

## 5. Test inventory

- Rust: 194 pass (26 new: pagination, staleness, windowing, comparisons, error
  mapping, boundary validation).
- Frontend: 1,334 pass across 124 files (new: commit-graph model incl. append
  equivalence property tests, infinite-query wrapper, 3 adapters, 2 composables,
  4 history components, query-key invalidation rules).

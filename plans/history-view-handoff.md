# Task: harden the "commit history + branch graph" feature (was a spike → now official)

## Background

This began as a deliberate THROWAWAY SPIKE to test whether a commit-history view with a
branch-graph rail was worth building for Cut Branches (a Tauri + Svelte 5 + Rust desktop
app for cleaning up git branches). It's now being promoted to real, shipping code. It was
built fast and iteratively, cutting corners a production feature shouldn't. Your job: (1)
find the problems, (2) propose improvements, (3) make it performant for large repos, then
implement the agreed changes.

Design intent (settled during the spike): help the user **understand-before-delete** — see
local branch tips (the deletion candidates), what's in each branch, and how they relate,
without leaving the app. The **left gutter is the decision surface**; the **graph is
context**. It is NOT meant to become a general git client.

## Where the code is

- **Backend** (all in ONE quarantined file, intentionally):
  `src-tauri/src/domains/branch_management/commands/spike_history.rs`
  - `list_commit_history`: git2 revwalk over ALL refs (`push_glob("refs/heads/*")` + HEAD),
    windowed by skip/limit, returns commits with parent SHAs + ref decorations tagged by
    kind (`localBranch | remoteBranch | tag | other`), plus `has_more`.
  - `list_branch_comparison`: per-local-branch ahead/behind via `graph_ahead_behind` vs a
    base (auto: main → master → HEAD).
  - Registered in `commands/mod.rs` and `src-tauri/src/main.rs` (`collect_commands!` + import).
- **Frontend** (route `src/routes/repos/[id]/history/`):
  - `+page.svelte` — the whole view.
  - `graph-lanes.ts` — pure, testable logic: lane assignment (`computeGraph`), collapse
    model (`buildDisplay`, `laneSet`), branch-locality coloring (`lineColor`).
  - `+page.ts` — ssr/prerender false.
  - Entry point: a "Commit history (spike)…" options-menu item added in
    `src/routes/repos/[id]/+page.svelte`.
- **Dependency added:** `@tanstack/svelte-virtual`.
- **Original plan / grilled decisions:** `plans/cheerful-mixing-cocoa.md`.

## What it does today

- Virtualized commit list (`@tanstack/svelte-virtual`) over "display items".
- **Left gutter (local branches only):** each is a Pindoba `Checkbox fullWidth` wrapping a
  Pindoba `Banner` — heading = branch name (truncates), subheading = ahead/behind/merged
  badges (semantic secondary-emphasis) + a "+N more" that opens a popover listing every
  local branch on that commit. Checkboxes feed a selection set; header shows "vs \<base\>"
  and a "Delete N" button.
- **Graph rail (SVG):** lanes + merges with rounded caps; **branch-locality coloring** —
  lines on a local branch's history render vivid (per-lane palette), everything else muted
  grey + lower opacity, so local branches pop. Dashed leader line from gutter to each head
  node. Fixed-width rail that CLIPS; a shared horizontal scrollbar pans all rows together;
  head circles PIN to the viewport edges when their lane scrolls off, and are CLICKABLE to
  re-center that lane.
- **Collapse:** runs of ≥2 consecutive non-head commits collapse into a "Show N commits"
  row (the whole row is the click target); expand shows a "Hide N commits" header. Collapsed
  bundle lane colors are kept consistent with the commit rows.

## Known spike shortcuts to fix (non-exhaustive — find more)

1. **Architecture:** the backend bypasses the project's layering. Move git access into the
   domain's `infrastructure/git` layer; follow command Input/Output + naming conventions
   (`list`/`get`, `*_by_id`…); translate errors via the domain's `BranchError` at the
   boundary; consider extending the shared-kernel `Commit` (today: single tip commit, no
   parents/refs) instead of the parallel spike DTO. Everything currently lives in one
   quarantined file with no tests.
2. **Frontend data layer:** uses raw `invoke()` instead of the project's generated bindings
   - `createTauriQuery` (TanStack Query). Move onto that for consistent
     caching/invalidation/types.
3. **No tests exist;** project requires co-located tests at 100% branch coverage.
   `graph-lanes.ts` is pure and highly testable — start there (lanes, collapse, locality all
   have clear invariants).
4. **The "Delete N" button is NOT wired** — it only shows a note. Integrate the existing
   confirm / bulk-delete flow (branch-management delete modal + `batch_delete` command).
5. **Pindoba integration:** the gutter row needed several `passThrough`/`fullWidth`
   workarounds to get truncation + badge layout right. Verify these are the intended API
   usage and not masking a styling bug. (Note: an earlier "white border" that was chased was
   the GUTTER DIVIDER, not the checkbox — ignore any checkbox-border claims.)
6. **The multi-branch popover** is a hand-rolled fixed-position element + backdrop — no
   keyboard nav, no anchored positioning, can misplace near viewport edges. Consider a real
   popover primitive.
7. **Graph density:** a unified DAG over a repo with ~100 concurrent branches yields a
   ~100-lane "picket fence", currently only contained via clip + horizontal scroll. The
   deferred better fix is a REDUCED graph (draw only lanes with visible nodes / bundle
   transit lanes). Evaluate.
8. **Hardcoded, theme-independent lane color palette;** revisit for theming/contrast.

## Performance — THE priority (must handle thousands of commits, hundreds of branches)

Profile and fix. Specific suspects:

- `list_commit_history` pages via `skip` by re-walking the revwalk from the start each page
  → O(n²) across pages. Use a resumable cursor instead of `skip`.
- `computeGraph` + `buildDisplay` re-run over ALL loaded commits on every append/state
  change (`$derived` full recompute), growing each page. Make incremental/memoized or move
  layout to a Web Worker.
- `list_branch_comparison` computes ahead/behind for EVERY local branch up front —
  expensive with many branches. Make it lazy/batched/cached (e.g. only visible branches).
- Each virtualized row re-renders its SVG on scroll; memoize per-row draw data.
- `refs_by_oid` is rebuilt on every history call.

Virtualization is already in place and should stay.

## Integration idea: deep-link + preview from the commit card

The existing branch/commit UI already shows a single tip commit
(`src/ui/core/commit-card.svelte`, embedded in `src/ui/core/branch-card.svelte`). Tie it to
this view:

- **Hover preview:** on hovering a commit card, show a compact popover preview of THIS
  history-graph around that commit — a few rail rows with the commit's node and its
  neighboring topology, so the user gets a peek at where the commit sits among branches
  without leaving the cleanup screen.
- **Click to deep-link:** clicking the commit card navigates to the history view
  (`/repos/[id]/history`) focused on that exact commit — the page opens already scrolled to
  and highlighting that commit.

What this requires (flag for the implementer):

- The history route must accept a target commit, e.g. `?commit=<sha>`, and on load resolve
  it, scroll the virtualizer to that row, and highlight it briefly.
- The target may be BEYOND the first loaded window. Options: keep paging until the sha is
  found (simple, but O(n) on deep commits), or add a backend capability to fetch a window
  CENTERED on / starting at a given sha (return its index or a page cursor for it) —
  preferable for large repos and consistent with the performance goals above (design it
  together with the cursor-based paging fix).
- If the target sits inside a COLLAPSED run, auto-expand that run so the commit is visible.
- Reuse the existing `computeGraph`/row-render for the popover preview at a small size, or
  render a trimmed N-row slice around the target — don't fork a second graph renderer.
- This crosses domains (cards in `ui/core/` + branch-management; graph view is its own
  route). Navigate via the router/URL — the sanctioned cross-domain channel per the design
  guide — not a direct import.

This makes the two surfaces reinforce each other: the card is the quick glance during
cleanup, and one click drops you into full topological context for that commit.

## Constraints

- Follow `CLAUDE.md` and `docs/code-design-guide.md` strictly (domain isolation, no
  cross-domain imports, thin routes, operation naming, co-located tests, 100% coverage).
- `src/lib/bindings.ts` is auto-generated — don't hand-edit; rebuild to regenerate.
- Conventional commits; do NOT add Claude co-author trailers.
- Verify end-to-end by running the app (`pnpm run dev`) against a large real repo, not just
  tests. Note: `pnpm run check` currently emits an unrelated environmental svelte-check
  error ("chunks/logger.js is not in cache") across ALL `.svelte` files — that predates this
  feature.

## Deliverables

1. A written findings report: bugs, architecture violations, prioritized improvements (with
   before/after perf numbers where possible).
2. The refactor to production quality: proper domain placement, real data layer, tests to
   100% coverage, wired deletion, and the performance fixes above.

Start by reading `graph-lanes.ts`, `+page.svelte`, and `spike_history.rs` end-to-end, then
the plan file, before proposing changes.

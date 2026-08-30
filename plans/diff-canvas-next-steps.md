# Diff canvas — next steps

State as of 2026-07-21 (branch `feat/big-refact`, committed through `d7cf24e`): the canvas review surface is feature-complete for v1 — tree-sitter structure analysis (`getDiffStructure`), list-view enrichment (changed symbols + impact badges), canvas mode (dependency-column layout, PCB traces with direction arrows, pan/zoom with crisp baked zoom, Space hand tool, focus mode, expanded-by-default diffs with visibility-gated mounting), and all findings from the 7-dimension code review landed (B1, B2, M1, L1–L8). Gates: 1634 frontend tests / 251 Rust tests / lint / check / clippy / fmt all green.

## 1. Land the work (do first)

- [x] **Committed** as `fc729e2` (shared git plumbing), `7479354` (code_structure backend), `78d5770` (structure query + canvas models), `d7cf24e` (canvas view — note the "work in progress" marker; amend/retitle before opening a PR if the canvas is considered done).
- [ ] **Manual QA pass on a real branch** (only human-verifiable items):
  - zoom in past 100% → text snaps crisp ~120ms after the pinch settles;
  - Space+drag pans from anywhere, never selects text, Clear/fit/expand buttons all clickable;
  - pan around a large expanded board → diffs stream in without jank;
  - rebase/commit the repo in a terminal while the canvas is open → edges/symbols refresh (B2);
  - focus → neighborhood + auto-fit → Escape restores.

## 2. Known follow-ups (small, non-blocking)

- [ ] **Port fan-out on dense nodes** (`edge-routing.ts` `portY`): high-index ports clamp to one y — a node with 15+ edges collapses its ports. Spread ports across the node's full height when count × step exceeds it.
- [x] **Lane crowding in narrow channels** — **DONE.** `canvas-layout.ts` now sizes each inter-column gap adaptively: baseline `COLUMN_GAP` (raised 120→140), widened by `LANE_PITCH` per extra edge run sharing the channel and, for direct Call edges, by the reserved width of their "uses …" hover label (so labels stop being clipped by the flanking panels), clamped to `MAX_COLUMN_GAP` (380). Mirrors edge-routing's entry/exit channel accounting so widths match the lanes drawn; routing needs no change (it reads the column geometry). Label formatting/width extracted to `models/edge-label.ts`, shared by the layout and `edge-layer.svelte`. Single-import channels stay exactly `COLUMN_GAP`.
- [ ] **Node virtualization** (distinct from diff-mount gating, which is done): 400+ collapsed node divs still render. Only needed if profiling shows it — the review flagged it as "decide", and visibility-gated diff mounting removed the heavy part.
- [ ] **Synthetic Svelte component `end_line`** (`analysis.rs`): verify `source.lines().count()` matches tree-sitter rows for files without trailing newline (flagged by review, unverified).
- [ ] **tsconfig `extends` chains** (`resolve.rs`): alias resolution reads one tsconfig; monorepos often put `paths` in a base config referenced via `extends`. Follow the chain through the git tree (bounded depth).
- [ ] **List-view search perf** (pre-canvas finding, still open): `searchTerm` reaches the diff rows un-debounced; each keystroke re-runs `buildMarkedRuns` on every mounted row of large open diffs. Debounce the term passed down or skip marking above a line budget.

## 3. Phase-2 product features (in rough priority order)

1. ~~**Review progress tracking**~~ — **DONE.** `useReviewedFiles` composable (`application/use-reviewed-files.svelte.ts`) holds a reactive `SvelteMap` of path → diff fingerprint, persisted per repo+target under `diff-reviewed:<repoPath>:<branch:name|commit:sha>` (mirrors `diff-view-options`). **Content-aware:** the fingerprint is the file's `linesAdded:linesRemoved` at review time; a file reads as reviewed only while its current fingerprint still matches, so a file that gains further changes silently drops its checkmark while unchanged files keep theirs (coarse — an edit with identical +/- totals slips through; a true diff hash would need a backend round-trip). Exposes `count`/`isReviewed(path)` (both reactive) rather than a materialized set — avoids `prefer-svelte-reactivity` and is finer-grained. Both surfaces share it: list rows (`changed-file-row.svelte`) and canvas nodes (`file-node.svelte`) each get a circle→circle-check toggle and dim to 0.5 opacity (hover restores) when reviewed; the view header shows an `X/Y reviewed` badge (turns success at 100%) with a Clear action. Gates green: 1660 FE tests / check / lint / format.
2. ~~**Symbol-level edges (`StructureEdgeKind::Call`)**~~ — **DONE.** Backend (tree-sitter pass 2, `code_structure/{models,analysis,application}.rs`): `analysis.rs` now extracts static import bindings (named/alias/default/namespace, via a whole-tree walk that skips `import_statement` subtrees) plus the set of identifiers used outside imports; `application.rs` emits **one edge per (from,to) pair**, upgraded from `Import` to `Call` with the sorted used-symbol names when the source actually references what it imported (`StructureEdge` gained a `symbols: Vec<String>` field, `StructureEdgeKind` gained `Call`). Import counts/layout are unchanged (a Call edge is still an import relationship). Frontend: `edge-routing.ts` threads `kind`/`symbols` + a `labelPoint` through `RoutedEdge`. **Edge colors** (`edge-colors.ts`): Call edges are stroked from the shared commit-graph lane palette (`colors.graph.lane.*`), keyed by a hash of the imported file, with per-lane arrowhead markers — same visual language as the history graph rail; import-only edges stay muted+dashed. Hovering a node **thickens** its edges and **dims** the rest (replaced the old primary recolor). **Labels** live in a separate `edge-labels.svelte` layer painted **ON TOP of the node panels** (traces stay beneath) as an **opaque multi-line chip** — a `uses` header then one symbol per line + `+N more` (`edge-label.ts`), so a long list grows downward into a narrow chip instead of a wide banner that panels clipped. Column spacing widened (`COLUMN_GAP` 120→200, cap 460) so traces/chips sit clearly between panels. Gates green: 252+258 Rust tests / clippy / fmt; 1665 FE tests / check / lint / format; both new FE files 100% branch coverage. Not done (future): namespace member-level precision (`ns.foo` only detects `ns` used), and an edit that keeps identical import bindings but changes call sites still shows the same edge.
3. **Multi-hop focus** — depth control on the focus chip (1 hop / 2 hops / all reachable) using a BFS over `listRelatedPaths`.
4. **Review-in-dependency-order walkthrough** — a "next file" button that walks the topological order (leaf dependencies first), auto-focusing each neighborhood; combine with reviewed-tracking to skip done files.
5. **Marquee selection** — plain background drag is now unclaimed (hand tool owns panning); drag-select a group of nodes to focus or mark reviewed together.
6. **Svelte grammar adoption** — replace the script-block scanner with a real tree-sitter Svelte grammar when crate quality allows, unlocking template-level analysis (component usage edges: `<FileNode>` in markup → import edge already exists, but usage sites/props could label it).

## 4. Deliberately out of scope (decided against, don't revisit without cause)

- Per-node drag/rearrange with persisted positions (original idea's grid snapping) — auto-layout has proven readable; revisit only if users fight the layout.
- Frontend-supplied alias maps — the analyzed repo's own tsconfig (read from the git tree) is the principled source.
- `content-visibility: auto` for diff rows — breaks horizontal scroll sizing (documented in `render-budget.ts`).

## Verification commands

`nvm use 22.9.0` first. Frontend: `pnpm test`, `pnpm run check`, `pnpm run lint`. Rust: `pnpm run test:cargo`, `pnpm rust:clippy`, `pnpm rust:fmt`. Bindings regenerate by briefly running the debug binary (`src-tauri/target/debug/app`) — export happens at runtime.

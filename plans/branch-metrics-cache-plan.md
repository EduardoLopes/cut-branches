# Plan: SHA-keyed branch metrics cache (instant badges)

> **Status (2026-08-01): all three phases implemented.**
> Phase 1 (cache) — done as designed; 10 new Rust tests.
> Phase 2 (git CLI fast path) — done, with libgit2 as an always-present
> per-branch fallback; cold 10-branch bucket on zig-dashboard 353ms → 211ms.
> Phase 3 (parallel `list_branches_fast`) — done; 221 branches 359ms → 89ms.
> Remaining ideas below the line are optional and evidence-gated (commit-graph
> upkeep; routing the single-branch commands through the cache).

State as of 2026-08-01 (branch `feat/big-refact`). Follow-up to the bulk-metrics
perf round: parallelized `bulk_get_branch_metrics` (2.87s → ~1.0s per 20-branch
batch on zig-dashboard), single merge-base per branch, bucket size 20 → 10
(~350ms per bucket), first bucket fires without the 150ms debounce.

## 1. Problem

The remaining per-navigation cost is pure git graph math — merge-base walk +
tree diff per branch — recomputed on every cold cache (app restart, >5min
staleTime, >10min gcTime). Measured (release build, 11 cores):

| Repo          | branches | 10-branch bucket            |
| ------------- | -------- | --------------------------- |
| zig-dashboard | 221      | ~350ms                      |
| zig-api       | 47       | ~250ms (est. from 20@869ms) |
| pindoba       | 29       | ~90ms                       |

The key insight: a branch's `(is_merged, lines_added, lines_removed)` is a pure
function of `(HEAD tip SHA, branch tip SHA)`. Both are immutable content
addresses — a cached result never goes stale, it only stops being _relevant_
when a ref moves. So the recurring cost can become a once-per-tip-ever cost,
persisted across restarts.

## 2. Design

### 2.1 New table `branch_metrics_cache`

New diesel migration (follow `2026-07-18-000000_normalize_commit_storage` layout):

```sql
CREATE TABLE branch_metrics_cache (
    head_sha      TEXT NOT NULL,
    branch_sha    TEXT NOT NULL,
    is_merged     BOOLEAN NOT NULL,
    lines_added   INTEGER NOT NULL,
    lines_removed INTEGER NOT NULL,
    computed_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (head_sha, branch_sha)
);
```

Notes:

- **No `repository_id`, no branch name.** The result is content-addressed;
  keying by SHAs alone means linked worktrees of the same repo share entries
  for free, and a branch rename costs nothing. Branch _names_ stay a runtime
  concern of the command.
- `lines_*` as INTEGER — the command already saturates to `u32`; SQLite
  INTEGER holds it.
- `computed_at` only exists for pruning (§2.4).

### 2.2 Repository layer

`src-tauri/src/domains/branch_management/infrastructure/repositories/` gains
(following existing file/function conventions, §1.6 naming):

- `get_branch_metrics_batch(conn, pairs: &[(String, String)]) -> Vec<CachedMetricsRecord>`
  — one `WHERE (head_sha, branch_sha) IN (...)` query per bucket. SQLite has no
  tuple-IN via diesel; filter on `head_sha = ?` (constant per call) `AND
branch_sha IN (...)` — HEAD is the same for the whole batch, so the key
  collapses to one column.
- `upsert_branch_metrics_batch(conn, rows)` — `INSERT OR REPLACE`, mirrors
  `upsert_commits_batch`.
- `prune_branch_metrics(conn)` — see §2.4.

### 2.3 Command flow (`bulk_get_branch_metrics` in `commands/queries.rs`)

The command gains `db: State<'_, DatabaseState>` (input shape unchanged →
**query keys and frontend stay untouched**; bindings regenerate anyway on next
debug run — see memory note: run the debug binary briefly).

1. Open repo once; resolve HEAD tip SHA and each requested branch's tip SHA
   (ref lookups only — microseconds, no graph walk).
2. Batch-read cache for `(head, tip_i)` pairs.
3. Misses → existing parallel `std::thread::scope` compute path, restricted to
   the missing names.
4. Upsert computed rows (single transaction), merge cached + computed, return
   in input order.
5. Branches whose ref no longer resolves are skipped, as today.

Failure isolation: cache read/write errors must degrade to compute-everything,
never fail the command — the cache is an optimization, not a source of truth
(log at `warn`).

Keep `infrastructure/git/branch.rs::bulk_get_branch_metrics` as the pure
compute function (no DB dependency — §1.2 core/infra separation); the DB
orchestration lives in the command layer or a small
`core/application/branch_metrics.rs` if the command body grows past trivial.

### 2.4 Pruning (keep the table from growing forever)

Every `(head, tip)` pair ever seen is a row; a busy repo creates a new `head`
on every commit. Two-part policy, run opportunistically inside the existing
sync path (`sync_branches_to_db`, next to `delete_orphan_commits`):

- Delete rows older than 30 days (`computed_at`).
- Hard cap: if the table exceeds ~50k rows, delete oldest-first down to the cap.

No correctness risk — pruning only re-exposes the compute path.

### 2.5 What does NOT change

- Frontend: `bulkBranchMetricsQueryOptions`, bucket size, debounce behavior,
  sidebar prefetch — all untouched. TanStack stays the in-memory layer; the DB
  is the cross-restart layer beneath it.
- `get_branch_merge_status` / `get_branch_diff_stats` single-branch commands:
  leave them; the list only uses the bulk path. (Optional later: route them
  through the same cache helper.)

## 3. Expected outcome

- First-ever sight of a branch tip: today's cost (~35ms/branch amortized,
  parallel).
- Every subsequent navigation, including after app restart: one ref resolve +
  one indexed SQLite read per bucket → **badges in single-digit ms**. After a
  new commit on HEAD, all pairs re-key and recompute once (unavoidable — the
  diffs genuinely changed).

## 4. Phase 2 (separate, only if cold path still matters)

Measured gap: git CLI merge-base ≈ 24ms/branch (uses commit-graph generation
numbers) vs libgit2 ≈ 100–150ms (doesn't). If cold buckets still feel slow
after caching:

- Shell out to `git merge-base` / `git diff --shortstat` in the compute path
  (parallel, bounded), falling back to libgit2 when `git` is unavailable.
- And/or write/refresh the commit-graph opportunistically
  (`git commit-graph write --reachable`) after sync on large repos.

Decision gate: rerun `bench_bulk_metrics_real_repo` after Phase 1; only
proceed if cold-bucket time on zig-dashboard still exceeds ~150ms.

## 5. Phase 3 (independent, smaller)

`list_branches_fast` costs ~360ms for 221 branches during resync (blocks the
`getRepository` query on first navigation after refs changed). Same treatment
as the metrics compute: parallelize the per-branch loop (peel + upstream
lookup) across threads with one repo handle each. Bench hook already prints it.

## 6. Testing & verification

- Repo-layer unit tests: batch get/upsert round-trip, tuple-key collapse
  (same head, many tips), prune by age and by cap.
- Command tests (existing pattern in `commands/queries.rs` tests): cold call
  computes and persists; second call with unchanged refs does zero compute
  (assert via a counter or by deleting the branch ref between calls — cached
  row must still be returned for the old tip only if the ref resolves, i.e.
  skipped when gone); HEAD moves → recompute.
- Bench: `BENCH_REPO=... cargo test --release --lib bench_bulk_metrics_real_repo -- --ignored --nocapture`
  before/after; add a warm-cache variant to the bench (call twice, print both).
- Gates: `pnpm rust:check`, full `pnpm test` (no frontend changes expected,
  but the suite guards the bindings), `pnpm check`.

## 7. Risks / edge cases

- **Detached HEAD**: `repo.head()` still resolves to a commit; cache keys work.
  (The current compute path already assumes a resolvable HEAD.)
- **Shallow clones**: merge-base can fail → branch skipped today; cache simply
  never gets a row. Unchanged behavior.
- **Migration on existing installs**: pure additive table; diesel runs it on
  startup as usual.
- **DB contention**: upserts are one small transaction per cold bucket; the
  watcher/sync writes are already heavier.

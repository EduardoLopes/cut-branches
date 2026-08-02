-- Persistent cache for per-branch metrics (merge status + diff stats).
-- A branch's metrics are a pure function of (HEAD tip sha, branch tip sha) —
-- both immutable content addresses — so rows never go stale; they only stop
-- being looked up when a ref moves. Content-keyed (no repository_id, no branch
-- name): linked worktrees of the same repository share entries, and a branch
-- rename costs nothing. `computed_at` exists only for pruning.

CREATE TABLE branch_metrics_cache (
    head_sha TEXT NOT NULL,
    branch_sha TEXT NOT NULL,
    is_merged BOOLEAN NOT NULL,
    lines_added INTEGER NOT NULL,
    lines_removed INTEGER NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (head_sha, branch_sha)
);

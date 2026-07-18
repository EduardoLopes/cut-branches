-- Initial schema baseline (squashed; pre-release, no shipped data).
-- Owns two tables: `repositories` (repository_management) and `branches`
-- (branch_management). Branch selection/locking are columns on `branches`.

CREATE TABLE repositories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    current_branch TEXT NOT NULL,
    branches_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_timestamp INTEGER,
    last_synced_at TIMESTAMP
);

CREATE TABLE branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    name TEXT NOT NULL,
    current BOOLEAN NOT NULL DEFAULT 0,
    fully_merged BOOLEAN NOT NULL DEFAULT 0,
    last_commit_sha TEXT NOT NULL,
    last_commit_short_sha TEXT NOT NULL,
    last_commit_date TEXT NOT NULL,
    last_commit_message TEXT NOT NULL,
    last_commit_summary TEXT NOT NULL,
    last_commit_author TEXT NOT NULL,
    last_commit_email TEXT NOT NULL,
    -- Remote tracking ref this branch follows (e.g. "origin/main"); NULL when
    -- the branch has no upstream configured.
    upstream TEXT,
    deleted_at TEXT,
    is_reachable BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_selected BOOLEAN NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT 0,
    -- Single-shared-DB-phase cross-domain FK, kept as documented debt (ADR 002).
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_branches_repository ON branches(repository_id);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);

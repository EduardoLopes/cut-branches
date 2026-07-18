-- Normalize commit storage: tip commits move to their own `commits` table and
-- `branches` keeps only a `head_commit_sha` pointer. The commit-history feature
-- reads git live and stores nothing; this table exists so branch rows —
-- including soft-deleted ones whose commits may have been GC'd — can still
-- render their tip commit.

CREATE TABLE commits (
    sha TEXT PRIMARY KEY NOT NULL,
    short_sha TEXT NOT NULL,
    date TEXT NOT NULL,
    message TEXT NOT NULL,
    summary TEXT NOT NULL,
    author TEXT NOT NULL,
    email TEXT NOT NULL
);

INSERT OR IGNORE INTO commits (sha, short_sha, date, message, summary, author, email)
SELECT last_commit_sha, last_commit_short_sha, last_commit_date,
       last_commit_message, last_commit_summary, last_commit_author, last_commit_email
FROM branches;

CREATE TABLE branches_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    name TEXT NOT NULL,
    current BOOLEAN NOT NULL DEFAULT 0,
    fully_merged BOOLEAN NOT NULL DEFAULT 0,
    head_commit_sha TEXT NOT NULL,
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
    FOREIGN KEY (head_commit_sha) REFERENCES commits(sha),
    UNIQUE(repository_id, name)
);

INSERT INTO branches_new (id, repository_id, name, current, fully_merged, head_commit_sha,
    upstream, deleted_at, is_reachable, created_at, updated_at, is_selected, is_locked)
SELECT id, repository_id, name, current, fully_merged, last_commit_sha,
    upstream, deleted_at, is_reachable, created_at, updated_at, is_selected, is_locked
FROM branches;

DROP TABLE branches;
ALTER TABLE branches_new RENAME TO branches;

CREATE INDEX idx_branches_repository ON branches(repository_id);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);
CREATE INDEX idx_branches_head_commit_sha ON branches(head_commit_sha);

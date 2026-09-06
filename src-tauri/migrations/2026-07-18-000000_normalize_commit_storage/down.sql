-- Re-denormalize: fold tip-commit fields back onto `branches` and drop `commits`.

CREATE TABLE branches_old (
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
    upstream TEXT,
    deleted_at TEXT,
    is_reachable BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_selected BOOLEAN NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, name)
);

INSERT INTO branches_old (id, repository_id, name, current, fully_merged,
    last_commit_sha, last_commit_short_sha, last_commit_date, last_commit_message,
    last_commit_summary, last_commit_author, last_commit_email,
    upstream, deleted_at, is_reachable, created_at, updated_at, is_selected, is_locked)
SELECT b.id, b.repository_id, b.name, b.current, b.fully_merged,
    c.sha, c.short_sha, c.date, c.message, c.summary, c.author, c.email,
    b.upstream, b.deleted_at, b.is_reachable, b.created_at, b.updated_at,
    b.is_selected, b.is_locked
FROM branches b
JOIN commits c ON c.sha = b.head_commit_sha;

DROP TABLE branches;
ALTER TABLE branches_old RENAME TO branches;
DROP TABLE commits;

CREATE INDEX idx_branches_repository ON branches(repository_id);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);

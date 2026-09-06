-- Audit log for the repository-cleanup domain. One row per folder deleted.
-- `repository_id` references repositories(id) by stable identifier only
-- (§1.3): no cross-domain FOREIGN KEY, so audit history is intentionally kept
-- even after a repository is removed from the app, and a repository DELETE
-- never cascades into this log.

CREATE TABLE cleanup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    target_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    bytes_freed BIGINT NOT NULL,
    deletion_mode TEXT NOT NULL,
    cleaned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cleanup_history_repository ON cleanup_history(repository_id);

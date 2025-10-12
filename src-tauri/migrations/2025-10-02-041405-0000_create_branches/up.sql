-- Branches table - stores all branch data including deleted branches
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
    last_commit_author TEXT NOT NULL,
    last_commit_email TEXT NOT NULL,
    deleted_at TEXT,
    is_reachable BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, name)
);

-- Selected branches (for bulk operations)
CREATE TABLE selected_branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, branch_name)
);

-- Locked branches (protected from deletion)
CREATE TABLE locked_branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, branch_name)
);

-- Indexes for faster queries
CREATE INDEX idx_branches_repository ON branches(repository_id);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);
CREATE INDEX idx_selected_branches_repository ON selected_branches(repository_id);
CREATE INDEX idx_locked_branches_repository ON locked_branches(repository_id);

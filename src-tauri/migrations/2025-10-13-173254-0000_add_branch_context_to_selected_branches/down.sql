-- This file should undo anything in `up.sql`

-- Recreate the original table structure
CREATE TABLE selected_branches_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id, branch_name),
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

-- Copy data from current table (excluding branch_context)
INSERT INTO selected_branches_new (id, repository_id, branch_name, created_at)
SELECT id, repository_id, branch_name, created_at
FROM selected_branches;

-- Drop current table and rename new one
DROP TABLE selected_branches;
ALTER TABLE selected_branches_new RENAME TO selected_branches;

-- Add branch_context column to selected_branches table
ALTER TABLE selected_branches ADD COLUMN branch_context TEXT NOT NULL DEFAULT 'current';

-- Update unique constraint to include branch_context
-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
CREATE TABLE selected_branches_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    branch_context TEXT NOT NULL DEFAULT 'current',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repository_id, branch_name, branch_context),
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO selected_branches_new (id, repository_id, branch_name, branch_context, created_at)
SELECT id, repository_id, branch_name, branch_context, created_at
FROM selected_branches;

-- Drop old table and rename new one
DROP TABLE selected_branches;
ALTER TABLE selected_branches_new RENAME TO selected_branches;

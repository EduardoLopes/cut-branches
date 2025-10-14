-- Recreate selected_branches table
CREATE TABLE selected_branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    branch_context TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, branch_name, branch_context)
);

-- Recreate locked_branches table
CREATE TABLE locked_branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, branch_name)
);

-- Migrate data back from branches table
-- Restore selected active branches (context 'current')
INSERT INTO selected_branches (repository_id, branch_name, branch_context)
SELECT repository_id, name, 'current'
FROM branches
WHERE is_selected = 1 AND deleted_at IS NULL;

-- Restore selected deleted branches (context 'restore')
INSERT INTO selected_branches (repository_id, branch_name, branch_context)
SELECT repository_id, name, 'restore'
FROM branches
WHERE is_selected = 1 AND deleted_at IS NOT NULL;

-- Restore locked branches
INSERT INTO locked_branches (repository_id, branch_name)
SELECT repository_id, name
FROM branches
WHERE is_locked = 1;

-- Recreate indexes
CREATE INDEX idx_selected_branches_repository ON selected_branches(repository_id);
CREATE INDEX idx_locked_branches_repository ON locked_branches(repository_id);

-- Remove columns from branches table
ALTER TABLE branches DROP COLUMN is_selected;
ALTER TABLE branches DROP COLUMN is_locked;

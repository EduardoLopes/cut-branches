-- Add is_selected and is_locked columns to branches table
ALTER TABLE branches ADD COLUMN is_selected BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE branches ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT 0;

-- Migrate data from selected_branches table
-- For active branches (deleted_at IS NULL) with context 'current'
UPDATE branches
SET is_selected = 1
WHERE (repository_id, name) IN (
    SELECT repository_id, branch_name
    FROM selected_branches
    WHERE branch_context = 'current'
) AND deleted_at IS NULL;

-- For deleted branches (deleted_at IS NOT NULL) with context 'restore'
UPDATE branches
SET is_selected = 1
WHERE (repository_id, name) IN (
    SELECT repository_id, branch_name
    FROM selected_branches
    WHERE branch_context = 'restore'
) AND deleted_at IS NOT NULL;

-- Migrate data from locked_branches table
UPDATE branches
SET is_locked = 1
WHERE (repository_id, name) IN (
    SELECT repository_id, branch_name
    FROM locked_branches
);

-- Drop old tables
DROP TABLE IF EXISTS selected_branches;
DROP TABLE IF EXISTS locked_branches;

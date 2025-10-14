-- Replace last_sync_hash (TEXT) with last_sync_timestamp (INTEGER) for faster comparisons
-- SQLite doesn't support column type changes directly, so we need to:
-- 1. Add new column
-- 2. Drop old column (SQLite requires recreating table for this)

-- For SQLite, we'll use a simpler approach: just add the new column and leave the old one
-- The old column will be ignored in the code
ALTER TABLE repositories ADD COLUMN last_sync_timestamp INTEGER;

-- If you want to fully remove last_sync_hash, you'd need to:
-- 1. Create new table with desired schema
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table
-- For now, keeping it simple with just adding the new column

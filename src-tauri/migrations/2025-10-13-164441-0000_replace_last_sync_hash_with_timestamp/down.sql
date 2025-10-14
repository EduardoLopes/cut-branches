-- Remove last_sync_timestamp column
-- Note: SQLite has limited ALTER TABLE support
-- This is a best-effort rollback
ALTER TABLE repositories DROP COLUMN last_sync_timestamp;

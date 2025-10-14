-- Remove last_sync_hash column from repositories table
ALTER TABLE repositories DROP COLUMN last_sync_hash;

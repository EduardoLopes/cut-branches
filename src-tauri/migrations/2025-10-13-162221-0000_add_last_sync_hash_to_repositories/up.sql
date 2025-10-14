-- Add last_sync_hash column to repositories table for efficient sync detection
ALTER TABLE repositories ADD COLUMN last_sync_hash TEXT;

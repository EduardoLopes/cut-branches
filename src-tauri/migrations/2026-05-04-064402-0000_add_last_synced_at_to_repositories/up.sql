-- Track when the FE/backend last successfully synced this repo from git.
-- Distinct from last_sync_timestamp, which stores git's own most-recent ref
-- mtime (used to detect whether a re-sync is needed).
ALTER TABLE repositories ADD COLUMN last_synced_at TIMESTAMP;

-- Settings table - key-value store for app settings and search state
CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repository_id, key)
);

-- Index for faster lookups
CREATE INDEX idx_settings_repository_key ON settings(repository_id, key);

-- Metadata table for tracking migrations and app state
CREATE TABLE metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial metadata
INSERT INTO metadata (key, value) VALUES ('version', '1.0.0');
INSERT INTO metadata (key, value) VALUES ('migrated_from_localstorage', '0');

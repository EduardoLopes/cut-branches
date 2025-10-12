-- Notifications table - stores toast notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT,
    message TEXT,
    feedback TEXT CHECK(feedback IN ('success', 'danger', 'warning', 'default')),
    date INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster date-based queries
CREATE INDEX idx_notifications_date ON notifications(date DESC);

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryLoadedEvent {
    pub repository_path: String,
    pub repository_name: String,
    pub branches_count: u32,
}

impl Event for RepositoryLoadedEvent {
    const NAME: &'static str = "repository-loaded";
}

/// Emitted when the filesystem watcher detects an external change to a watched
/// repository and has re-synced it to the database. The frontend listens for
/// this and invalidates the affected TanStack queries.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryChangedEvent {
    pub repository_id: String,
}

impl Event for RepositoryChangedEvent {
    const NAME: &'static str = "repository-changed";
}

/// Emitted periodically while `discover_repositories` walks the filesystem so
/// the UI can show live scan progress (folders visited, repositories found so
/// far). Throttled by the command to avoid flooding the event channel.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryScanProgressEvent {
    pub scanned_dirs: u32,
    pub found_count: u32,
    pub current_path: Option<String>,
}

impl Event for RepositoryScanProgressEvent {
    const NAME: &'static str = "repository-scan-progress";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NotificationEvent {
    pub title: String,
    pub message: String,
    pub kind: NotificationKind,
    pub duration: Option<u32>,
}

impl Event for NotificationEvent {
    const NAME: &'static str = "notification";
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum NotificationKind {
    Success,
    Error,
    Warning,
    Info,
}

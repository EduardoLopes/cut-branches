use crate::shared::kernel::branch::Branch;

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GitDirResponse {
    pub path: String,
    pub branches: Vec<Branch>,
    pub current_branch: String,
    pub branches_count: u32,
    pub name: String,
    pub id: String,
    pub last_synced_at: Option<chrono::NaiveDateTime>,
    /// Whether this repository's working directory is a linked git worktree
    /// (rather than the main worktree). Worktree management is offered only for
    /// the main worktree, so the UI hides it when this is true.
    pub is_worktree: bool,
}

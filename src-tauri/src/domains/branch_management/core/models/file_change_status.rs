//! What happened to a file between two trees — shared vocabulary of every
//! diff-shaped feature (branch_diff, code_structure) and the git
//! infrastructure that classifies deltas.

use serde::{Deserialize, Serialize};

/// What happened to a file between the two trees.
#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileChangeStatus {
    Added,
    Deleted,
    Modified,
    Renamed,
}

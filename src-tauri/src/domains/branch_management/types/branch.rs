use serde::{Deserialize, Serialize};
use super::commit::Commit;

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
pub struct Branch {
    pub name: String,
    #[serde(rename = "fullyMerged")]
    pub fully_merged: bool,
    #[serde(rename = "lastCommit")]
    pub last_commit: Commit,
    pub current: bool,
}
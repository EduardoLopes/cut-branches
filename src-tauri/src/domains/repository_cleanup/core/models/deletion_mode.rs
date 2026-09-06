//! How a cleanup target is removed from disk (§1.2 value type).

use serde::{Deserialize, Serialize};
use specta::Type;

/// Deletion strategy chosen per cleanup action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum DeletionMode {
    /// Move to the OS recycle bin — recoverable by the user (default).
    Trash,
    /// Permanent `remove_dir_all` — irreversible, space reclaimed immediately.
    Permanent,
}

impl DeletionMode {
    /// Stable string used when recording history rows.
    pub fn as_str(&self) -> &'static str {
        match self {
            DeletionMode::Trash => "trash",
            DeletionMode::Permanent => "permanent",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn as_str_is_stable() {
        assert_eq!(DeletionMode::Trash.as_str(), "trash");
        assert_eq!(DeletionMode::Permanent.as_str(), "permanent");
    }

    #[test]
    fn serializes_camel_case() {
        assert_eq!(
            serde_json::to_string(&DeletionMode::Trash).unwrap(),
            "\"trash\""
        );
        assert_eq!(
            serde_json::to_string(&DeletionMode::Permanent).unwrap(),
            "\"permanent\""
        );
    }
}

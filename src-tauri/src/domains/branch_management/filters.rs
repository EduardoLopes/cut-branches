use serde::{Deserialize, Serialize};

/// Filter for branch deletion status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum DeletionStatusFilter {
    /// Only active (non-deleted) branches
    #[default]
    Active,
    /// Only deleted branches
    Deleted,
    /// Both active and deleted branches
    All,
}

/// Filter for branch merge status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum MergeStatusFilter {
    /// Only fully merged branches
    Merged,
    /// Only unmerged branches
    Unmerged,
    /// Both merged and unmerged branches
    #[default]
    All,
}

/// Filter for branch selection status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum SelectionStatusFilter {
    /// Only selected branches
    Selected,
    /// Only unselected branches
    Unselected,
    /// Both selected and unselected branches
    #[default]
    All,
}

/// Filter for branch lock status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum LockStatusFilter {
    /// Only locked branches
    Locked,
    /// Only unlocked branches
    Unlocked,
    /// Both locked and unlocked branches
    #[default]
    All,
}

/// Comprehensive filter configuration for querying branches
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BranchFilters {
    /// Filter by deletion status (default: Active - only non-deleted branches)
    #[serde(default)]
    pub deletion_status: DeletionStatusFilter,

    /// Filter by merge status (default: All)
    #[serde(default)]
    pub merge_status: MergeStatusFilter,

    /// Filter by selection status (default: All)
    #[serde(default)]
    pub selection_status: SelectionStatusFilter,

    /// Filter by lock status (default: All)
    #[serde(default)]
    pub lock_status: LockStatusFilter,

    /// Whether to include the current branch in results (default: true)
    #[serde(default = "default_include_current")]
    pub include_current: bool,
}

fn default_include_current() -> bool {
    true
}

impl Default for BranchFilters {
    fn default() -> Self {
        Self {
            deletion_status: DeletionStatusFilter::default(),
            merge_status: MergeStatusFilter::default(),
            selection_status: SelectionStatusFilter::default(),
            lock_status: LockStatusFilter::default(),
            include_current: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_deletion_status_filter() {
        assert_eq!(
            DeletionStatusFilter::default(),
            DeletionStatusFilter::Active
        );
    }

    #[test]
    fn test_default_merge_status_filter() {
        assert_eq!(MergeStatusFilter::default(), MergeStatusFilter::All);
    }

    #[test]
    fn test_default_selection_status_filter() {
        assert_eq!(SelectionStatusFilter::default(), SelectionStatusFilter::All);
    }

    #[test]
    fn test_default_lock_status_filter() {
        assert_eq!(LockStatusFilter::default(), LockStatusFilter::All);
    }

    #[test]
    fn test_default_branch_filters() {
        let filters = BranchFilters::default();
        assert_eq!(filters.deletion_status, DeletionStatusFilter::Active);
        assert_eq!(filters.merge_status, MergeStatusFilter::All);
        assert_eq!(filters.selection_status, SelectionStatusFilter::All);
        assert_eq!(filters.lock_status, LockStatusFilter::All);
        assert!(filters.include_current);
    }

    #[test]
    fn test_serialization() {
        let filters = BranchFilters {
            deletion_status: DeletionStatusFilter::Deleted,
            merge_status: MergeStatusFilter::Merged,
            selection_status: SelectionStatusFilter::Selected,
            lock_status: LockStatusFilter::Locked,
            include_current: false,
        };

        let json = serde_json::to_string(&filters).unwrap();
        let deserialized: BranchFilters = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.deletion_status, filters.deletion_status);
        assert_eq!(deserialized.merge_status, filters.merge_status);
        assert_eq!(deserialized.selection_status, filters.selection_status);
        assert_eq!(deserialized.lock_status, filters.lock_status);
        assert_eq!(deserialized.include_current, filters.include_current);
    }

    #[test]
    fn test_deserialization_with_defaults() {
        let json = r#"{}"#;
        let filters: BranchFilters = serde_json::from_str(json).unwrap();

        assert_eq!(filters.deletion_status, DeletionStatusFilter::Active);
        assert_eq!(filters.merge_status, MergeStatusFilter::All);
        assert_eq!(filters.selection_status, SelectionStatusFilter::All);
        assert_eq!(filters.lock_status, LockStatusFilter::All);
        assert!(filters.include_current);
    }

    #[test]
    fn test_deserialization_partial() {
        let json = r#"{"deletionStatus": "deleted", "includeCurrent": false}"#;
        let filters: BranchFilters = serde_json::from_str(json).unwrap();

        assert_eq!(filters.deletion_status, DeletionStatusFilter::Deleted);
        assert_eq!(filters.merge_status, MergeStatusFilter::All);
        assert_eq!(filters.selection_status, SelectionStatusFilter::All);
        assert_eq!(filters.lock_status, LockStatusFilter::All);
        assert!(!filters.include_current);
    }
}

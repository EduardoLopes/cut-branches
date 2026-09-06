//! Shared git2 diff plumbing for the branch_management domain.
//!
//! Every diff-shaped feature (branch_diff, code_structure) resolves the same
//! (base, target) tree pair and walks the same rename-detecting diff; this
//! module owns that plumbing so the feature slices stay independent of each
//! other. For a branch target the base is the merge-base with HEAD (only the
//! branch's own work counts); for a commit target it is the first parent
//! (the root commit diffs against the empty tree).

use std::path::Path;

use git2::{BranchType, Delta, DiffFindOptions, DiffOptions, Repository, Tree};

use crate::domains::branch_management::core::models::file_change_status::FileChangeStatus;
use crate::domains::branch_management::error::BranchError;

/// What to diff: a branch (vs merge-base with HEAD) or a commit (vs parent).
#[derive(Clone, Copy)]
pub enum DiffTarget<'a> {
    Branch(&'a str),
    Commit(&'a str),
}

impl DiffTarget<'_> {
    pub(crate) fn describe(&self) -> String {
        match self {
            DiffTarget::Branch(name) => format!("branch {name}"),
            DiffTarget::Commit(sha) => format!("commit {sha}"),
        }
    }
}

pub(crate) fn open_repo(path: &Path) -> Result<Repository, BranchError> {
    Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })
}

/// Resolves the (base, target) trees for a diff target. A `None` base means
/// the empty tree (root commit).
pub(crate) fn resolve_trees<'r>(
    repo: &'r Repository,
    path: &Path,
    target: DiffTarget<'_>,
) -> Result<(Option<Tree<'r>>, Tree<'r>), BranchError> {
    let diff_err = |source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    };

    match target {
        DiffTarget::Branch(name) => {
            let head_commit = repo
                .head()
                .map_err(|e| BranchError::HeadNotFound { source: e })?
                .peel_to_commit()
                .map_err(|e| BranchError::HeadCommitFailed { source: e })?;

            let branch = repo.find_branch(name, BranchType::Local).map_err(|e| {
                BranchError::FindBranchFailed {
                    name: name.to_string(),
                    source: e,
                }
            })?;
            let branch_commit = branch
                .get()
                .peel_to_commit()
                .map_err(|e| BranchError::BranchCommitFailed { source: e })?;

            // Diff from the merge-base so only the branch's own work counts —
            // commits HEAD gained since divergence don't show up as removals.
            let base_oid = repo
                .merge_base(head_commit.id(), branch_commit.id())
                .map_err(diff_err)?;
            let base_tree = repo
                .find_commit(base_oid)
                .and_then(|c| c.tree())
                .map_err(diff_err)?;
            let branch_tree = branch_commit.tree().map_err(diff_err)?;

            Ok((Some(base_tree), branch_tree))
        }
        DiffTarget::Commit(sha) => {
            let commit = repo
                .revparse_single(sha)
                .ok()
                .and_then(|obj| obj.peel_to_commit().ok())
                .ok_or_else(|| BranchError::CommitNotFoundInRepo {
                    sha: sha.to_string(),
                    path: path.display().to_string(),
                })?;

            let base_tree = match commit.parent(0) {
                Ok(parent) => Some(parent.tree().map_err(diff_err)?),
                // Root commit: diff against the empty tree.
                Err(_) => None,
            };
            let commit_tree = commit.tree().map_err(diff_err)?;

            Ok((base_tree, commit_tree))
        }
    }
}

/// Builds the tree-to-tree diff with rename detection applied.
pub(crate) fn build_diff<'r>(
    repo: &'r Repository,
    base_tree: Option<&Tree<'r>>,
    target_tree: &Tree<'r>,
    target: DiffTarget<'_>,
    opts: Option<&mut DiffOptions>,
) -> Result<git2::Diff<'r>, BranchError> {
    let diff_err = |source| BranchError::DiffFailed {
        target: target.describe(),
        source,
    };

    let mut diff = repo
        .diff_tree_to_tree(base_tree, Some(target_tree), opts)
        .map_err(diff_err)?;
    diff.find_similar(Some(DiffFindOptions::new().renames(true)))
        .map_err(diff_err)?;
    Ok(diff)
}

pub(crate) fn map_status(delta: Delta) -> FileChangeStatus {
    match delta {
        Delta::Added => FileChangeStatus::Added,
        Delta::Deleted => FileChangeStatus::Deleted,
        Delta::Renamed | Delta::Copied => FileChangeStatus::Renamed,
        _ => FileChangeStatus::Modified,
    }
}

/// The display path of a delta (old path for deletions) and the rename
/// source when the two sides differ.
pub(crate) fn delta_paths(delta: &git2::DiffDelta<'_>) -> (String, Option<String>) {
    let old = delta
        .old_file()
        .path()
        .map(|p| p.to_string_lossy().into_owned());
    let new = delta
        .new_file()
        .path()
        .map(|p| p.to_string_lossy().into_owned());

    match (old, new) {
        (old, Some(new)) => {
            let old_path = old.filter(|o| *o != new);
            (new, old_path)
        }
        (Some(old), None) => (old, None),
        (None, None) => (String::new(), None),
    }
}

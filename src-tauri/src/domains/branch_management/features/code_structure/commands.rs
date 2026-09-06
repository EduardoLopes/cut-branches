//! Delivery command for the diff structure analysis.
//!
//! Same target contract as the sibling `branch_diff` commands: exactly one
//! of `branch_name` / `commit_sha`, validated at the boundary. The analysis
//! (git diff + tree-sitter parsing) is CPU-bound and runs on the blocking
//! pool.

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::application;
use super::models::{FileStructure, StructureEdge};
use crate::domains::branch_management::core::models::branch_name::BranchName;
use crate::domains::branch_management::core::models::commit_sha::CommitSha;
use crate::domains::branch_management::infrastructure::git::diff::DiffTarget;
use crate::shared::error::AppError;

/// Maps a `spawn_blocking` join failure (panic/cancellation) to an `AppError`.
fn join_error(e: tokio::task::JoinError) -> AppError {
    AppError::new(
        "Structure analysis failed".to_string(),
        "structure_analysis_failed",
        Some(e.to_string()),
    )
}

/// A validated diff target: exactly one of branch / commit. (Local copy of
/// `branch_diff`'s boundary validation — same contract, self-contained slice.)
enum ValidatedTarget {
    Branch(BranchName),
    Commit(CommitSha),
}

impl ValidatedTarget {
    fn new(branch_name: Option<String>, commit_sha: Option<String>) -> Result<Self, AppError> {
        match (branch_name, commit_sha) {
            (Some(branch), None) => Ok(Self::Branch(BranchName::new(branch)?)),
            (None, Some(sha)) => Ok(Self::Commit(CommitSha::new(sha)?)),
            _ => Err(AppError::new(
                "A diff target requires exactly one of branchName or commitSha".to_string(),
                "invalid_diff_target",
                None,
            )),
        }
    }

    fn as_diff_target(&self) -> DiffTarget<'_> {
        match self {
            Self::Branch(name) => DiffTarget::Branch(name.as_str()),
            Self::Commit(sha) => DiffTarget::Commit(sha.as_str()),
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetDiffStructureInput {
    /// Filesystem path to the repository.
    pub path: String,
    /// Analyze a branch (vs merge-base with HEAD). Mutually exclusive with
    /// `commit_sha`.
    #[serde(default)]
    pub branch_name: Option<String>,
    /// Analyze a commit (vs its first parent). Mutually exclusive with
    /// `branch_name`.
    #[serde(default)]
    pub commit_sha: Option<String>,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetDiffStructureOutput {
    /// One entry per changed file, in diff order.
    pub files: Vec<FileStructure>,
    /// Import relations between changed files, deduped and sorted.
    pub edges: Vec<StructureEdge>,
}

/// Analyzes the code structure of a diff: which symbols each changed file's
/// hunks touch, and which changed files import each other — the data behind
/// the canvas view and the list view's impact badges.
#[tauri::command(async)]
#[specta::specta]
pub async fn get_diff_structure(
    input: GetDiffStructureInput,
) -> Result<GetDiffStructureOutput, AppError> {
    let target = ValidatedTarget::new(input.branch_name, input.commit_sha)?;

    let (files, edges) = tokio::task::spawn_blocking(move || {
        application::get_diff_structure(Path::new(&input.path), target.as_diff_target())
    })
    .await
    .map_err(join_error)??;

    Ok(GetDiffStructureOutput { files, edges })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{commit_file, run_git, setup_test_repo, DirectoryGuard};

    #[tokio::test]
    async fn requires_exactly_one_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path().display().to_string();

        let err = get_diff_structure(GetDiffStructureInput {
            path: path.clone(),
            branch_name: None,
            commit_sha: None,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_diff_target");

        let err = get_diff_structure(GetDiffStructureInput {
            path,
            branch_name: Some("main".to_string()),
            commit_sha: Some("abc1234".to_string()),
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_diff_target");
    }

    #[tokio::test]
    async fn validates_target_values_at_the_boundary() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();

        let err = get_diff_structure(GetDiffStructureInput {
            path: repo.path().display().to_string(),
            branch_name: Some("bad name with spaces".to_string()),
            commit_sha: None,
        })
        .await
        .unwrap_err();
        assert_eq!(err.kind, "invalid_branch_name");
    }

    #[tokio::test]
    async fn returns_files_and_edges_for_a_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/link"]);
        commit_file(
            path,
            "src/b.ts",
            "export const b = () => 1;\n",
            "Add b.ts",
            "2024-01-01T10:00:00",
        );
        commit_file(
            path,
            "src/a.ts",
            "import { b } from './b';\nexport const a = () => b();\n",
            "Add a.ts",
            "2024-01-01T10:01:00",
        );
        run_git(path, &["checkout", "main"]);

        let output = get_diff_structure(GetDiffStructureInput {
            path: path.display().to_string(),
            branch_name: Some("feature/link".to_string()),
            commit_sha: None,
        })
        .await
        .unwrap();

        assert_eq!(output.files.len(), 2);
        assert_eq!(output.edges.len(), 1);
        assert_eq!(output.edges[0].from, "src/a.ts");
        assert_eq!(output.edges[0].to, "src/b.ts");
    }

    #[tokio::test]
    async fn returns_structure_for_a_commit_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        run_git(path, &["checkout", "-b", "feature/commit"]);
        commit_file(
            path,
            "src/only.ts",
            "export const only = () => 1;\n",
            "Add only.ts",
            "2024-01-01T10:00:00",
        );
        let tip = run_git(path, &["rev-parse", "HEAD"]);
        run_git(path, &["checkout", "main"]);

        let output = get_diff_structure(GetDiffStructureInput {
            path: path.display().to_string(),
            branch_name: None,
            commit_sha: Some(tip),
        })
        .await
        .unwrap();

        assert_eq!(output.files.len(), 1);
        assert_eq!(output.files[0].path, "src/only.ts");
        assert_eq!(
            output.files[0]
                .changed_symbols
                .iter()
                .map(|s| s.name.as_str())
                .collect::<Vec<_>>(),
            vec!["only"]
        );
    }
}

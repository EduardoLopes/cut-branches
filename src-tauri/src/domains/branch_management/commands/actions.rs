use std::path::Path;
use tauri::State;

use super::super::core::models::commit_sha::CommitSha;
use super::super::core::models::deletion::{DeletedBranch, RestoreBranchResult};
use crate::shared::error::AppError;
use crate::shared::infrastructure::db::DatabaseState;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCurrentBranchInput {
    pub path: String,
    pub branch: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCurrentBranchOutput {
    pub current_branch: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRestorationInput {
    pub path: String,
    pub repo_id: String,
    pub branch_info: DeletedBranch,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRestorationOutput {
    pub result: RestoreBranchResult,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateBranchRestorationsInput {
    pub path: String,
    pub repo_id: String,
    pub branch_infos: Vec<DeletedBranch>,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BatchCreateBranchRestorationsOutput {
    pub results: Vec<RestoreBranchResult>,
}

/// Rejects a restoration request whose commit SHA is not a SHA.
///
/// The git layer resolves restore targets strictly by object id, so a value
/// that is not hexadecimal can only ever fail deeper down with a vaguer
/// error. Validating here keeps the domain rule in one place and gives the
/// caller the `invalid_commit_sha` kind.
fn validate_restoration_shas(branch_infos: &[DeletedBranch]) -> Result<(), AppError> {
    for branch_info in branch_infos {
        CommitSha::new(&branch_info.commit_sha)?;
    }
    Ok(())
}

/// Creates a restoration of a deleted branch in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `db` - Database state for updating branch status
/// * `input` - Input parameters containing path and branch info
///
/// # Returns
///
/// * `Result<CreateBranchRestorationOutput, AppError>` - The restoration result or an error
#[tauri::command]
#[specta::specta]
pub async fn create_branch_restoration(
    app: tauri::AppHandle,
    db: State<'_, DatabaseState>,
    input: CreateBranchRestorationInput,
) -> Result<CreateBranchRestorationOutput, AppError> {
    validate_restoration_shas(std::slice::from_ref(&input.branch_info))?;

    let raw_path = Path::new(&input.path);
    let result = super::super::core::application::restoration::restore_deleted_branch(
        raw_path,
        &input.branch_info,
        Some(&app),
    )?;

    // If restoration was successful, mark branch as active in database
    if result.success {
        let mut conn = db.get_connection().map_err(|e| {
            AppError::new(
                "Failed to get database connection".to_string(),
                "db_connection_failed",
                Some(e),
            )
        })?;

        crate::domains::branch_management::infrastructure::repositories::mark_branches_as_active(
            &mut conn,
            &input.repo_id,
            std::slice::from_ref(&result.branch_name),
        )
        .map_err(|e| {
            AppError::new(
                "Failed to mark branch as active in database".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;
    }

    Ok(CreateBranchRestorationOutput { result })
}

/// Creates restorations of multiple deleted branches in a git repository.
///
/// # Arguments
///
/// * `app` - The AppHandle
/// * `db` - Database state for updating branch status
/// * `input` - Input parameters containing path and branch infos
///
/// # Returns
///
/// * `Result<BatchCreateBranchRestorationsOutput, AppError>` - The restoration results or an error
#[tauri::command]
#[specta::specta]
pub async fn batch_create_branch_restorations(
    app: tauri::AppHandle,
    db: State<'_, DatabaseState>,
    input: BatchCreateBranchRestorationsInput,
) -> Result<BatchCreateBranchRestorationsOutput, AppError> {
    validate_restoration_shas(&input.branch_infos)?;

    let raw_path = Path::new(&input.path);
    let results = super::super::core::application::restoration::restore_deleted_branches(
        raw_path,
        &input.branch_infos,
        Some(&app),
    )?;

    // Mark successfully restored branches as active in database
    let successful_branch_names: Vec<String> = results
        .iter()
        .filter(|result| result.success)
        .map(|result| result.branch_name.clone())
        .collect();

    if !successful_branch_names.is_empty() {
        let mut conn = db.get_connection().map_err(|e| {
            AppError::new(
                "Failed to get database connection".to_string(),
                "db_connection_failed",
                Some(e),
            )
        })?;

        crate::domains::branch_management::infrastructure::repositories::mark_branches_as_active(
            &mut conn,
            &input.repo_id,
            &successful_branch_names,
        )
        .map_err(|e| {
            AppError::new(
                "Failed to mark branches as active in database".to_string(),
                "db_update_failed",
                Some(e.to_string()),
            )
        })?;
    }

    Ok(BatchCreateBranchRestorationsOutput { results })
}

/// Updates the current branch in a git repository (switches to another branch).
///
/// # Arguments
///
/// * `input` - Input parameters containing path and branch name
///
/// # Returns
///
/// * `Result<UpdateCurrentBranchOutput, AppError>` - The new current branch name or an error
#[tauri::command(async)]
#[specta::specta]
pub async fn update_current_branch(
    input: UpdateCurrentBranchInput,
) -> Result<UpdateCurrentBranchOutput, AppError> {
    let raw_path = Path::new(&input.path);
    let current_branch =
        super::super::core::application::switching::switch_branch(raw_path, &input.branch)?;

    Ok(UpdateCurrentBranchOutput { current_branch })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn deleted_branch(commit_sha: &str) -> DeletedBranch {
        DeletedBranch {
            original_name: "feature".to_string(),
            target_name: "feature".to_string(),
            commit_sha: commit_sha.to_string(),
            conflict_resolution: None,
        }
    }

    #[test]
    fn accepts_full_and_short_shas() {
        assert!(validate_restoration_shas(&[]).is_ok());
        assert!(validate_restoration_shas(&[deleted_branch(&"a".repeat(40))]).is_ok());
        assert!(validate_restoration_shas(&[deleted_branch("abc1234")]).is_ok());
    }

    #[test]
    fn rejects_anything_that_is_not_a_sha() {
        for raw in ["", "HEAD", "main", "not-a-sha", "abc", &"a".repeat(41)] {
            let err = validate_restoration_shas(&[deleted_branch(raw)])
                .expect_err("'{raw}' must be rejected");
            assert_eq!(err.kind, "invalid_commit_sha");
        }
    }

    #[test]
    fn rejects_a_batch_when_any_entry_is_invalid() {
        let err =
            validate_restoration_shas(&[deleted_branch(&"a".repeat(40)), deleted_branch("HEAD")])
                .expect_err("one bad entry rejects the batch");
        assert_eq!(err.kind, "invalid_commit_sha");
    }
}

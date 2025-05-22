use std::io::ErrorKind;
use std::path::Path;
use std::process::Command;

use super::types::Commit;
use crate::error::Error; // Assuming types.rs is in the same parent directory (git/)

pub fn get_last_commit_info(path: &Path, branch: &str) -> Result<Commit, Error> {
    let result = Command::new("git")
        .arg("log")
        .arg("-1")
        .arg("--pretty=format:%H|%ad|%s|%an|%ae")
        .arg(branch)
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    let stderr = String::from_utf8(result.stderr).map_err(|e| {
        Error::new(
            format!("Failed to parse stderr: {}", e),
            "stderr_parse_failed",
            Some(format!("Error parsing git error output to UTF-8: {}", e)),
        )
    })?;

    if result.status.success() {
        let commit_info_str = String::from_utf8(result.stdout).map_err(|e| {
            Error::new(
                format!("Failed to parse stdout: {}", e),
                "stdout_parse_failed",
                Some(format!("Error parsing commit info to UTF-8: {}", e)),
            )
        })?;
        let commit_info_parts: Vec<&str> = commit_info_str.trim().split('|').collect();

        if commit_info_parts.len() == 5 {
            return Ok(Commit {
                sha: commit_info_parts[0].to_string(),
                short_sha: if commit_info_parts[0].len() >= 7 {
                    commit_info_parts[0][0..7].to_string()
                } else {
                    commit_info_parts[0].to_string()
                },
                date: commit_info_parts[1].to_string(),
                message: commit_info_parts[2].to_string(),
                author: commit_info_parts[3].to_string(),
                email: commit_info_parts[4].to_string(),
            });
        } else {
            return Err(Error::new(
                "Unexpected commit info format".to_string(),
                "unexpected_format",
                Some(commit_info_parts.join("|")),
            ));
        }
    }

    Err(Error::new(
        format!(
            "Couldn\\'t find the last commit in the path **{0}** for branch **{1}**",
            path.display(),
            branch
        ),
        "no_commit",
        Some(stderr),
    ))
}

pub fn is_commit_reachable(path: &Path, commit_sha: &str) -> Result<bool, Error> {
    if commit_sha.is_empty() {
        // git cat-file -e fails on empty string
        return Ok(false);
    }
    let result = Command::new("git")
        .arg("cat-file")
        .arg("-e")
        .arg(format!("{}^{{commit}}", commit_sha)) // Verify it's a commit object
        .current_dir(path)
        .output()
        .map_err(|e: std::io::Error| match e.kind() {
            ErrorKind::NotFound | ErrorKind::PermissionDenied => Error::new(
                format!("Unable to access the path **{}**: {}", path.display(), e),
                "unable_to_access_dir",
                Some(e.to_string()),
            ),
            _ => Error::new(
                format!(
                    "Failed to execute git command for path {}: {}",
                    path.display(),
                    e
                ),
                "command_execution_failed",
                Some(e.to_string()),
            ),
        })?;

    Ok(result.status.success())
}

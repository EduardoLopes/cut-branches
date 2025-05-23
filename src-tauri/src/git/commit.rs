use git2::Repository;
use std::path::Path;

use crate::error::Error;

pub fn is_commit_reachable(path: &Path, commit_sha: &str) -> Result<bool, Error> {
    if commit_sha.is_empty() {
        return Ok(false);
    }

    let repo = match Repository::open(path) {
        Ok(repo) => repo,
        Err(_) => return Ok(false), // Return false for non-git directories
    };

    // Use revparse_single to handle both full and short SHA hashes
    let result = match repo.revparse_single(commit_sha) {
        Ok(_) => true,
        Err(_) => false,
    };
    Ok(result)
}

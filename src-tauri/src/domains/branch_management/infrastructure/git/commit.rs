use chrono::{DateTime, FixedOffset, TimeZone};
use git2::Repository;
use std::path::Path;

use crate::shared::error::AppError;

/// Formats a git commit time as `"%a %b %e %T %Y %z"` (the app-wide commit
/// date format), falling back to UTC for invalid offsets and to the epoch
/// for invalid timestamps.
pub(crate) fn format_commit_time(time: git2::Time) -> String {
    let offset_minutes = time.offset_minutes();
    let offset = match FixedOffset::east_opt(offset_minutes * 60) {
        Some(tz) => tz,
        None => FixedOffset::east_opt(0).unwrap(), // Fallback to UTC
    };

    let dt = match DateTime::from_timestamp(time.seconds(), 0) {
        Some(dt) => dt.with_timezone(&offset),
        None => FixedOffset::east_opt(0)
            .unwrap()
            .with_ymd_and_hms(1970, 1, 1, 0, 0, 0)
            .unwrap(), // Fallback to epoch
    };

    dt.format("%a %b %e %T %Y %z").to_string()
}

/// Returns the 7-character abbreviated form of a full SHA (or the SHA
/// unchanged when it is already shorter).
pub(crate) fn short_sha(sha: &str) -> String {
    if sha.len() >= 7 {
        sha[0..7].to_string()
    } else {
        sha.to_string()
    }
}

/// Git's full SHA-1 hex length.
const FULL_SHA_LEN: usize = 40;

/// Resolves a commit *by object id only*.
///
/// `revparse_single` accepts the whole revspec grammar - `HEAD`, `main`,
/// `@{-1}`, `:/message`, `v1.0^{}` - so feeding it a value that is supposed
/// to be a SHA silently resolves things the caller never meant to name (a
/// restore of the branch "HEAD" would land on whatever HEAD happens to be).
/// A full SHA is parsed as an `Oid` and looked up directly; only genuinely
/// abbreviated input falls back to a prefix lookup, and anything that is not
/// hexadecimal is rejected outright.
pub(crate) fn find_commit_by_sha<'repo>(
    repo: &'repo Repository,
    commit_sha: &str,
) -> Result<git2::Commit<'repo>, git2::Error> {
    let sha = commit_sha.trim();

    if sha.is_empty() || sha.len() > FULL_SHA_LEN || !sha.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(git2::Error::from_str(&format!(
            "'{}' is not a commit SHA",
            commit_sha
        )));
    }

    if sha.len() == FULL_SHA_LEN {
        let oid = git2::Oid::from_str(sha)?;
        repo.find_commit(oid)
    } else {
        repo.find_commit_by_prefix(sha)
    }
}

pub fn is_commit_reachable(path: &Path, commit_sha: &str) -> Result<bool, AppError> {
    if commit_sha.is_empty() {
        return Ok(false);
    }

    let repo = match Repository::open(path) {
        Ok(repo) => repo,
        Err(_) => return Ok(false), // Return false for non-git directories
    };

    let reachable = find_commit_by_sha(&repo, commit_sha).is_ok();
    Ok(reachable)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{setup_test_repo, DirectoryGuard};
    use std::process::Command;

    #[test]
    fn test_format_commit_time() {
        // 2021-01-01 00:00:00 UTC, +02:00 offset
        let formatted = format_commit_time(git2::Time::new(1_609_459_200, 120));
        assert_eq!(formatted, "Fri Jan  1 02:00:00 2021 +0200");

        // Invalid offset (out of chrono's ±24h range) falls back to UTC
        let formatted = format_commit_time(git2::Time::new(1_609_459_200, 100_000));
        assert_eq!(formatted, "Fri Jan  1 00:00:00 2021 +0000");

        // Out-of-range timestamp falls back to the epoch
        let formatted = format_commit_time(git2::Time::new(i64::MAX, 0));
        assert_eq!(formatted, "Thu Jan  1 00:00:00 1970 +0000");
    }

    #[test]
    fn test_short_sha() {
        assert_eq!(
            short_sha("0123456789abcdef0123456789abcdef01234567"),
            "0123456"
        );
        assert_eq!(short_sha("0123456"), "0123456");
        assert_eq!(short_sha("012"), "012");
        assert_eq!(short_sha(""), "");
    }

    #[test]
    fn test_is_commit_reachable() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let result = is_commit_reachable(path, &commit_sha);
        assert!(result.is_ok());
        assert!(result.unwrap(), "Current HEAD commit should be reachable");

        let invalid_sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
        let result = is_commit_reachable(path, invalid_sha);
        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "Non-existent commit should not be reachable"
        );
    }

    #[test]
    fn test_is_commit_reachable_comprehensive() {
        let _guard = DirectoryGuard::new();
        let non_git_dir = tempfile::tempdir().unwrap();
        let non_git_path = non_git_dir.path();
        let dummy_sha = "0123456789abcdef0123456789abcdef01234567";
        let result = is_commit_reachable(non_git_path, dummy_sha);
        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "is_commit_reachable should return false for non-git directories"
        );

        let repo = setup_test_repo();
        let path = repo.path();
        let commit_output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let full_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        let short_sha = full_sha[..7].to_string();
        let result = is_commit_reachable(path, &short_sha);
        assert!(result.is_ok());
        assert!(result.unwrap(), "Short SHA should be reachable");

        let non_existent_sha = "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f"; // unlikely to exist
        let result = is_commit_reachable(path, non_existent_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Non-existent SHA should not be reachable");

        let malformed_sha = "not-a-sha";
        let result = is_commit_reachable(path, malformed_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Malformed SHA should not be reachable");

        let empty_sha = "";
        let result = is_commit_reachable(path, empty_sha);
        assert!(result.is_ok());
        assert!(!result.unwrap(), "Empty SHA should not be reachable");
    }

    /// Reachability is about object ids, not revspecs: `HEAD`, branch names
    /// and `@{-1}` must not resolve, or a caller passing a branch name where a
    /// SHA was expected would silently operate on the wrong commit.
    #[test]
    fn test_revspecs_are_not_accepted_as_shas() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        for revspec in [
            "HEAD",
            "main",
            "HEAD~0",
            "@{-1}",
            ":/Initial",
            "HEAD^{tree}",
        ] {
            assert!(
                !is_commit_reachable(path, revspec).unwrap(),
                "'{revspec}' must not resolve as a commit SHA"
            );
        }
    }

    /// Full SHAs resolve by id; a well-formed SHA that is not a commit (a
    /// blob) or that names nothing is rejected; short prefixes still work.
    #[test]
    fn test_find_commit_by_sha() {
        let _guard = DirectoryGuard::new();
        let repo_dir = setup_test_repo();
        let path = repo_dir.path();
        let repo = Repository::open(path).unwrap();

        let full = String::from_utf8(
            Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(path)
                .output()
                .unwrap()
                .stdout,
        )
        .unwrap()
        .trim()
        .to_string();

        assert_eq!(
            find_commit_by_sha(&repo, &full).unwrap().id().to_string(),
            full
        );
        // Surrounding whitespace and upper case are tolerated.
        assert!(find_commit_by_sha(&repo, &format!("  {}  ", full.to_uppercase())).is_ok());
        assert!(find_commit_by_sha(&repo, &full[..8]).is_ok(), "short SHA");

        let blob = String::from_utf8(
            Command::new("git")
                .args(["rev-parse", "HEAD:test.txt"])
                .current_dir(path)
                .output()
                .unwrap()
                .stdout,
        )
        .unwrap()
        .trim()
        .to_string();
        assert!(
            find_commit_by_sha(&repo, &blob).is_err(),
            "a blob id is not a commit"
        );

        assert!(find_commit_by_sha(&repo, &"0".repeat(40)).is_err());
        assert!(find_commit_by_sha(&repo, "").is_err());
        assert!(find_commit_by_sha(&repo, "not-a-sha").is_err());
        assert!(
            find_commit_by_sha(&repo, &"a".repeat(41)).is_err(),
            "over-long input is rejected before any lookup"
        );
    }
}

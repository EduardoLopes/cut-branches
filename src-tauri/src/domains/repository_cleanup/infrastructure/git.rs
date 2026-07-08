//! Reads the last-commit time of a repository via git2 (§1.1 infrastructure).

use std::path::Path;

use git2::Repository;

/// Unix timestamp (seconds) of the commit at `HEAD`, or `None` if the repo
/// can't be opened or has no commits yet. Used to judge how long a repository
/// has gone without git activity.
pub fn last_commit_time(path: &Path) -> Option<i64> {
    let repo = Repository::open(path).ok()?;
    let head = repo.head().ok()?;
    let commit = head.peel_to_commit().ok()?;
    Some(commit.time().seconds())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn init_repo_with_commit(path: &Path) {
        let repo = Repository::init(path).unwrap();
        let sig = git2::Signature::now("Test", "test@example.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[])
            .unwrap();
    }

    #[test]
    fn reads_commit_time_of_committed_repo() {
        let tmp = TempDir::new().unwrap();
        init_repo_with_commit(tmp.path());
        assert!(last_commit_time(tmp.path()).is_some());
    }

    #[test]
    fn none_for_non_repo() {
        let tmp = TempDir::new().unwrap();
        assert!(last_commit_time(tmp.path()).is_none());
    }
}

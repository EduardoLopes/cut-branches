use git2::{BranchType, Repository};
use std::path::Path;
use tauri::Emitter;

use super::commit::is_commit_reachable;
use crate::domains::branch_management::core::models::deletion::{
    ConflictDetails, ConflictResolution, DeletedBranch, DeletedBranchInfo, RestoreBranchResult,
};
use crate::domains::branch_management::error::BranchError;
use crate::shared::error::AppError;
// `Branch`/`Commit` are shared-kernel contracts (§1.4); the DB-row → domain
// mapping below stays here in branch infrastructure.
pub use crate::shared::kernel::branch::{Branch, Commit};

impl
    From<(
        crate::shared::infrastructure::db::models::BranchRecord,
        crate::shared::infrastructure::db::models::CommitRecord,
    )> for Branch
{
    fn from(
        (record, commit): (
            crate::shared::infrastructure::db::models::BranchRecord,
            crate::shared::infrastructure::db::models::CommitRecord,
        ),
    ) -> Self {
        Branch {
            name: record.name,
            fully_merged: record.fully_merged,
            last_commit: Commit {
                sha: commit.sha,
                short_sha: commit.short_sha,
                date: commit.date,
                message: commit.message,
                summary: commit.summary,
                author: commit.author,
                email: commit.email,
            },
            current: record.current,
            upstream: record.upstream,
            deleted_at: record.deleted_at,
            is_reachable: record.is_reachable,
            is_selected: record.is_selected,
            is_locked: record.is_locked,
        }
    }
}

pub fn get_all_branches_with_last_commit(path: &Path) -> Result<Vec<Branch>, AppError> {
    get_all_branches_with_last_commit_internal(path, false)
}

/// Get all branches with last commit info, with option to skip expensive merge check.
/// Use `skip_merge_check: true` for better performance when merge status isn't needed.
pub fn get_all_branches_with_last_commit_fast(path: &Path) -> Result<Vec<Branch>, AppError> {
    get_all_branches_with_last_commit_internal(path, true)
}

fn get_all_branches_with_last_commit_internal(
    path: &Path,
    skip_merge_check: bool,
) -> Result<Vec<Branch>, AppError> {
    let repo = Repository::open(path).map_err(|e| {
        let err_str = e.to_string();
        let err_str_lower = err_str.to_lowercase();
        if !path.exists() {
            BranchError::UnableToAccessDir {
                path: path.display().to_string(),
                detail: err_str.clone(),
            }
        } else if err_str_lower.contains("permission denied")
            || err_str_lower.contains("not permitted")
        {
            BranchError::CommandExecutionFailed {
                path: path.display().to_string(),
                detail: err_str.clone(),
            }
        } else {
            BranchError::RepositoryOpenFailed {
                path: path.display().to_string(),
                source: e,
            }
        }
    })?;

    // Enumerate names first (cheap ref iteration), then build the per-branch
    // records in parallel: the peel + author + upstream lookups cost ~1.5ms a
    // branch, which on a few-hundred-branch repo turns into whole tenths of a
    // second sequentially — and this runs inside `get_repository` on every
    // resync. `Repository` isn't `Sync`, so each worker opens its own handle
    // and takes names off a shared cursor. Order is restored by the sort below.
    let mut names = Vec::new();
    for branch_result in repo
        .branches(Some(BranchType::Local))
        .map_err(|e| BranchError::ListFailed { source: e })?
    {
        let (branch, _branch_type) =
            branch_result.map_err(|e| BranchError::InfoFailed { source: e })?;
        names.push(
            branch
                .name()
                .map_err(|e| BranchError::NameFailed { source: e })?
                .ok_or(BranchError::InvalidUtf8)?
                .to_string(),
        );
    }

    // A detached HEAD is a legitimate repository state: nothing is marked
    // `current`, the listing still succeeds.
    let current_branch_name = find_current_branch(path)?;
    let current_branch_name = current_branch_name.as_deref();

    let workers = std::thread::available_parallelism()
        .map(std::num::NonZeroUsize::get)
        .unwrap_or(4)
        .min(names.len())
        .max(1);
    let cursor = std::sync::atomic::AtomicUsize::new(0);
    let mut slots: Vec<Option<Result<Branch, AppError>>> = Vec::new();
    slots.resize_with(names.len(), || None);
    let slots_mutex = std::sync::Mutex::new(&mut slots);

    std::thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                let repo = match Repository::open(path) {
                    Ok(repo) => repo,
                    Err(_) => return, // slot stays None; surfaced as InfoFailed below
                };
                loop {
                    let index = cursor.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    let Some(name) = names.get(index) else {
                        return;
                    };
                    let result = build_branch(&repo, name, current_branch_name, skip_merge_check);
                    if let Ok(mut slots) = slots_mutex.lock() {
                        slots[index] = Some(result);
                    }
                }
            });
        }
    });

    // Same failure semantics as the sequential loop: any branch that can't be
    // read fails the listing (callers treat the list as all-or-nothing).
    let mut branches = Vec::with_capacity(names.len());
    for slot in slots {
        match slot {
            Some(Ok(branch)) => branches.push(branch),
            Some(Err(e)) => return Err(e),
            None => {
                return Err(BranchError::RepositoryOpenFailed {
                    path: path.display().to_string(),
                    source: git2::Error::from_str("worker failed to open repository"),
                }
                .into())
            }
        }
    }

    branches.sort_by_cached_key(|b| b.name.to_lowercase());

    // An empty list is a legitimate state: a repository whose HEAD is unborn
    // (freshly `git init`ed, no commits yet) simply has no branches. Treating
    // it as an error made such repositories impossible to add.
    Ok(branches)
}

/// One branch's full listing record, resolved against an open repo. The
/// per-branch body of `get_all_branches_with_last_commit_internal`, extracted
/// so the parallel workers can share it.
fn build_branch(
    repo: &Repository,
    name: &str,
    current_branch_name: Option<&str>,
    skip_merge_check: bool,
) -> Result<Branch, AppError> {
    let branch =
        repo.find_branch(name, BranchType::Local)
            .map_err(|e| BranchError::FindBranchFailed {
                name: name.to_string(),
                source: e,
            })?;

    let commit = branch
        .get()
        .peel_to_commit()
        .map_err(|e| BranchError::CommitPeelFailed {
            name: name.to_string(),
            source: e,
        })?;

    let author = commit.author();
    let date_str = super::commit::format_commit_time(commit.time());
    let sha = commit.id().to_string();
    let short_sha = super::commit::short_sha(&sha);
    let author_name = author.name().unwrap_or("").to_string();
    let author_email = author.email().unwrap_or("").to_string();
    // Store the full commit message (subject + body). `trim_end` drops
    // git's trailing newline so an empty body isn't persisted as whitespace.
    let message = commit.message().unwrap_or("").trim_end().to_string();
    // The subject line, kept alongside the full message for compact display.
    let summary = commit.summary().unwrap_or("").to_string();

    // Remote tracking ref (e.g. "origin/main"); `None` when the branch has
    // no configured upstream.
    let upstream = branch
        .upstream()
        .ok()
        .and_then(|up| up.name().ok().flatten().map(str::to_string));

    // Check if branch is fully merged into HEAD (skip if requested for performance)
    let is_merged = if skip_merge_check {
        false
    } else {
        is_branch_merged(repo, name)?
    };

    Ok(Branch {
        name: name.to_string(),
        fully_merged: is_merged,
        current: current_branch_name == Some(name),
        upstream,
        last_commit: Commit {
            sha,
            short_sha,
            date: date_str,
            message,
            summary,
            author: author_name,
            email: author_email,
        },
        deleted_at: None,
        is_reachable: None,
        is_selected: false,
        is_locked: false,
    })
}

pub fn is_branch_merged(repo: &Repository, branch_name: &str) -> Result<bool, AppError> {
    let head = repo
        .head()
        .map_err(|e| BranchError::HeadNotFound { source: e })?;

    let branch_ref = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| BranchError::FindBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    // Get the commit each reference points to
    let head_commit = head
        .peel_to_commit()
        .map_err(|e| BranchError::HeadCommitFailed { source: e })?;

    let branch_commit = branch_ref
        .get()
        .peel_to_commit()
        .map_err(|e| BranchError::BranchCommitFailed { source: e })?;

    // If it's the current branch, it's "merged" by definition
    if head_commit.id() == branch_commit.id() {
        return Ok(true);
    }

    // Check if the branch commit is an ancestor of HEAD
    Ok(repo
        .graph_descendant_of(head_commit.id(), branch_commit.id())
        .unwrap_or(false))
}

/// Check if a branch is fully merged into HEAD.
/// This is a path-based wrapper around is_branch_merged for easier use from command layer.
///
/// # Arguments
///
/// * `path` - Path to the git repository
/// * `branch_name` - Name of the branch to check
///
/// # Returns
///
/// * `Result<bool, AppError>` - true if the branch is fully merged, false otherwise
pub fn check_branch_merge_status(path: &Path, branch_name: &str) -> Result<bool, AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    is_branch_merged(&repo, branch_name)
}

/// Line-level diff stats of a branch relative to its merge-base with HEAD:
/// how many lines the branch adds and removes on top of the current branch.
/// Returns `(lines_added, lines_removed)`. A branch pointing at HEAD (or an
/// ancestor of it) yields `(0, 0)`.
pub fn get_branch_diff_stats(path: &Path, branch_name: &str) -> Result<(usize, usize), AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    branch_diff_stats_in_repo(&repo, branch_name)
}

/// Same as [`get_branch_diff_stats`] but against an already-open repository,
/// so batch callers pay the repo-open cost once.
pub fn branch_diff_stats_in_repo(
    repo: &Repository,
    branch_name: &str,
) -> Result<(usize, usize), AppError> {
    let head_commit = repo
        .head()
        .map_err(|e| BranchError::HeadNotFound { source: e })?
        .peel_to_commit()
        .map_err(|e| BranchError::HeadCommitFailed { source: e })?;

    let branch = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| BranchError::FindBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    let branch_commit = branch
        .get()
        .peel_to_commit()
        .map_err(|e| BranchError::BranchCommitFailed { source: e })?;

    let diff_err = |source| BranchError::DiffStatsFailed {
        name: branch_name.to_string(),
        source,
    };

    // Diff from the merge-base so only the branch's own work counts — commits
    // HEAD gained since the branch diverged don't show up as removals.
    let base_oid = repo
        .merge_base(head_commit.id(), branch_commit.id())
        .map_err(diff_err)?;
    let base_tree = repo
        .find_commit(base_oid)
        .and_then(|c| c.tree())
        .map_err(diff_err)?;
    let branch_tree = branch_commit.tree().map_err(diff_err)?;

    let diff = repo
        .diff_tree_to_tree(Some(&base_tree), Some(&branch_tree), None)
        .map_err(diff_err)?;
    let stats = diff.stats().map_err(diff_err)?;

    Ok((stats.insertions(), stats.deletions()))
}

/// Resolves the HEAD tip and each named branch's tip to commit SHAs — ref
/// lookups only, no graph walks. Branches that no longer resolve are omitted
/// (same tolerance as the bulk metrics compute). Used by the metrics cache:
/// the (head, tip) pair is the cache key.
pub fn resolve_branch_tips(
    path: &Path,
    branch_names: &[String],
) -> Result<(String, Vec<(String, String)>), AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    let head_sha = repo
        .head()
        .map_err(|e| BranchError::HeadNotFound { source: e })?
        .peel_to_commit()
        .map_err(|e| BranchError::HeadCommitFailed { source: e })?
        .id()
        .to_string();

    let tips = branch_names
        .iter()
        .filter_map(|name| {
            let branch = repo.find_branch(name, BranchType::Local).ok()?;
            let commit = branch.get().peel_to_commit().ok()?;
            Some((name.clone(), commit.id().to_string()))
        })
        .collect();

    Ok((head_sha, tips))
}

/// Whether a `git` binary is on PATH — probed once per process. The CLI fast
/// path below is an optimization; when git is absent everything routes through
/// libgit2, so this must never error.
fn git_cli_available() -> bool {
    static AVAILABLE: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    *AVAILABLE.get_or_init(|| {
        std::process::Command::new("git")
            .env_remove("GIT_DIR")
            .env_remove("GIT_WORK_TREE")
            .env_remove("GIT_INDEX_FILE")
            .arg("--version")
            .output()
            .map(|out| out.status.success())
            .unwrap_or(false)
    })
}

/// Runs one git subcommand in `path` and returns trimmed stdout on success.
fn git_cli_stdout(path: &Path, args: &[&str]) -> Option<String> {
    let out = std::process::Command::new("git")
        .env_remove("GIT_DIR")
        .env_remove("GIT_WORK_TREE")
        .env_remove("GIT_INDEX_FILE")
        .arg("-C")
        .arg(path)
        .args(args)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Parses `git diff --shortstat` output, e.g.
/// ` 3 files changed, 10 insertions(+), 2 deletions(-)`. Either count can be
/// absent; empty output means an empty diff.
fn parse_shortstat(stat: &str) -> (usize, usize) {
    let mut added = 0;
    let mut removed = 0;
    for part in stat.split(',') {
        let part = part.trim();
        let Some((count, _)) = part.split_once(' ') else {
            continue;
        };
        let Ok(count) = count.parse::<usize>() else {
            continue;
        };
        if part.contains("insertion") {
            added = count;
        } else if part.contains("deletion") {
            removed = count;
        }
    }
    (added, removed)
}

/// Metrics for one branch via the `git` CLI. Measurably faster than the
/// libgit2 walk on repositories with a commit-graph file (which git maintains
/// by default on fetch/gc): ~24ms vs ~100-150ms per merge-base on a 50k-commit
/// repo, because git exploits generation numbers and libgit2 does not.
///
/// Returns `None` on *any* failure — missing branch, odd output, git absent —
/// and the caller falls back to libgit2. The CLI is never the only path.
fn branch_metrics_via_git_cli(path: &Path, branch_name: &str) -> Option<BranchMetricsRecord> {
    // Fully-qualified refname so a branch can't collide with a path or tag.
    let refname = format!("refs/heads/{branch_name}");
    let tip = git_cli_stdout(path, &["rev-parse", "--verify", &refname])?;
    let base = git_cli_stdout(path, &["merge-base", "HEAD", &refname])?;
    let is_merged = base == tip;

    let (lines_added, lines_removed) = if is_merged {
        // A merged branch adds nothing on top of HEAD by definition.
        (0, 0)
    } else {
        parse_shortstat(&git_cli_stdout(
            path,
            &["diff", "--shortstat", &base, &tip],
        )?)
    };

    Some(BranchMetricsRecord {
        name: branch_name.to_string(),
        is_merged,
        lines_added,
        lines_removed,
    })
}

/// Merge status + diff stats for one branch from a single merge-base lookup:
/// a branch is fully merged into HEAD exactly when the merge base *is* the
/// branch tip, so the ancestry walk `is_branch_merged` does separately comes
/// for free with the base the diff needs anyway.
fn branch_metrics_in_repo(
    repo: &Repository,
    branch_name: &str,
) -> Result<BranchMetricsRecord, AppError> {
    let head_commit = repo
        .head()
        .map_err(|e| BranchError::HeadNotFound { source: e })?
        .peel_to_commit()
        .map_err(|e| BranchError::HeadCommitFailed { source: e })?;

    let branch_commit = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| BranchError::FindBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?
        .get()
        .peel_to_commit()
        .map_err(|e| BranchError::BranchCommitFailed { source: e })?;

    let diff_err = |source| BranchError::DiffStatsFailed {
        name: branch_name.to_string(),
        source,
    };

    let base_oid = repo
        .merge_base(head_commit.id(), branch_commit.id())
        .map_err(diff_err)?;
    let is_merged = base_oid == branch_commit.id();

    // A merged branch adds nothing on top of HEAD by definition — skip the
    // tree diff entirely.
    let (lines_added, lines_removed) = if is_merged {
        (0, 0)
    } else {
        let base_tree = repo
            .find_commit(base_oid)
            .and_then(|c| c.tree())
            .map_err(diff_err)?;
        let branch_tree = branch_commit.tree().map_err(diff_err)?;
        let diff = repo
            .diff_tree_to_tree(Some(&base_tree), Some(&branch_tree), None)
            .map_err(diff_err)?;
        let stats = diff.stats().map_err(diff_err)?;
        (stats.insertions(), stats.deletions())
    };

    Ok(BranchMetricsRecord {
        name: branch_name.to_string(),
        is_merged,
        lines_added,
        lines_removed,
    })
}

/// Merge status + diff stats for one branch, resolved against an open repo.
pub struct BranchMetricsRecord {
    pub name: String,
    pub is_merged: bool,
    pub lines_added: usize,
    pub lines_removed: usize,
}

/// Batch variant of the per-branch metric lookups: opens the repository once
/// and resolves merge status and diff stats for every requested branch.
/// Branches that no longer resolve (deleted mid-flight) are skipped rather
/// than failing the whole batch.
pub fn bulk_get_branch_metrics(
    path: &Path,
    branch_names: &[String],
) -> Result<Vec<BranchMetricsRecord>, AppError> {
    // Open once up front so an unreadable repository still fails the batch
    // with the usual error instead of yielding a silently empty result.
    Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    // The merge-base + tree-diff pair is CPU-bound and independent per branch,
    // and on real repositories it costs tens to hundreds of milliseconds per
    // branch — a sequential 20-branch bucket ran into whole seconds. git2's
    // `Repository` isn't `Sync`, so each worker opens its own handle (cheap
    // next to a single diff) and takes branches off a shared cursor.
    let workers = std::thread::available_parallelism()
        .map(std::num::NonZeroUsize::get)
        .unwrap_or(4)
        .min(branch_names.len())
        .max(1);

    let use_cli = git_cli_available();
    let cursor = std::sync::atomic::AtomicUsize::new(0);
    let mut slots: Vec<Option<BranchMetricsRecord>> = Vec::new();
    slots.resize_with(branch_names.len(), || None);
    let slots_mutex = std::sync::Mutex::new(&mut slots);

    std::thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                let Ok(repo) = Repository::open(path) else {
                    return;
                };
                loop {
                    let index = cursor.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    let Some(name) = branch_names.get(index) else {
                        return;
                    };
                    // CLI fast path first (commit-graph-accelerated), libgit2
                    // as the always-present fallback. Branches that resolve on
                    // neither (deleted mid-flight) are skipped rather than
                    // failing the whole batch.
                    let cli_record = if use_cli {
                        branch_metrics_via_git_cli(path, name)
                    } else {
                        None
                    };
                    let record = match cli_record
                        .map(Ok)
                        .unwrap_or_else(|| branch_metrics_in_repo(&repo, name))
                    {
                        Ok(record) => record,
                        Err(_) => continue,
                    };
                    if let Ok(mut slots) = slots_mutex.lock() {
                        slots[index] = Some(record);
                    }
                }
            });
        }
    });

    Ok(slots.into_iter().flatten().collect())
}

/// Name of the checked-out branch, or `None` when HEAD is detached or unborn.
///
/// Detached HEAD is a normal state (`git checkout --detach`, a bisect, a tag
/// checkout), and an *unborn* HEAD is just a repository with no commits yet, so
/// every read path that merely *describes* the repository uses this and treats
/// `None` as "no branch is current". Only operations that genuinely require a
/// branch treat `None` as an error themselves.
pub fn find_current_branch(path: &Path) -> Result<Option<String>, AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    let head = match repo.head() {
        Ok(head) => head,
        Err(e) if e.code() == git2::ErrorCode::UnbornBranch => return Ok(None),
        Err(e) => return Err(BranchError::HeadNotFound { source: e }.into()),
    };

    if !head.is_branch() {
        return Ok(None);
    }

    let branch_name = head
        .shorthand()
        .ok_or_else(|| BranchError::InvalidBranchName {
            path: path.display().to_string(),
        })?;

    Ok(Some(branch_name.to_string()))
}

pub fn branch_exists(path: &Path, branch_name: &str) -> Result<bool, AppError> {
    let repo = match Repository::open(path) {
        Ok(repo) => repo,
        Err(_) => return Ok(false),
    };

    // Fix lifetime issue by not directly returning the match
    let exists = repo.find_branch(branch_name, BranchType::Local).is_ok();

    Ok(exists)
}

pub fn switch_branch(path: &Path, branch_name: &str) -> Result<String, AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    // Check if branch exists
    if !branch_exists(path, branch_name)? {
        return Err(BranchError::BranchNotFound {
            name: branch_name.to_string(),
            path: path.display().to_string(),
        }
        .into());
    }

    // Get reference to branch
    let branch_ref = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| BranchError::FindBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    let reference = branch_ref.get();
    let commit = reference
        .peel_to_commit()
        .map_err(|e| BranchError::CommitPeelFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    // Update the working directory *before* moving HEAD, and do it safely: a
    // forced checkout would silently discard uncommitted changes, and moving
    // HEAD first would leave the repository inconsistent if the checkout then
    // failed. `safe()` mirrors `git switch`, which refuses to overwrite local
    // modifications.
    let tree = commit.tree().map_err(|e| BranchError::CommitPeelFailed {
        name: branch_name.to_string(),
        source: e,
    })?;
    repo.checkout_tree(
        tree.as_object(),
        Some(git2::build::CheckoutBuilder::new().safe()),
    )
    .map_err(|e| BranchError::CheckoutFailed {
        name: branch_name.to_string(),
        source: e,
    })?;

    // Set HEAD to the branch
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| BranchError::SetHeadFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    Ok(branch_name.to_string())
}

/// Maps every local branch that is checked out in a *linked* worktree to that
/// worktree's path. Best-effort: a worktree whose administrative files are
/// unreadable (pruned, on an unmounted volume) is simply skipped, since the
/// only cost of missing one is that libgit2 refuses the delete later.
fn branches_checked_out_in_worktrees(
    repo: &Repository,
) -> std::collections::HashMap<String, String> {
    let mut checked_out = std::collections::HashMap::new();

    let Ok(names) = repo.worktrees() else {
        return checked_out;
    };

    for name in names.iter().flatten() {
        let Ok(worktree) = repo.find_worktree(name) else {
            continue;
        };
        let Ok(worktree_repo) = Repository::open_from_worktree(&worktree) else {
            continue;
        };
        let Ok(head) = worktree_repo.head() else {
            continue;
        };
        if !head.is_branch() {
            continue;
        }
        if let Some(branch) = head.shorthand() {
            checked_out.insert(branch.to_string(), worktree.path().display().to_string());
        }
    }

    checked_out
}

/// Deletes every named branch, or none of them.
///
/// Deleting is not transactional in git, so the guard is a full pre-flight:
/// every name must exist and must not be checked out (here or in a linked
/// worktree) before the first `delete()` runs. Validating inside the delete
/// loop — as this used to — meant a failure halfway through left the earlier
/// branches gone from git while the caller, seeing an `Err`, never recorded
/// them as deleted in the database.
pub fn delete_branches(
    path: &Path,
    branches_to_delete: &[String],
) -> Result<Vec<DeletedBranchInfo>, AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    let mut not_found_branches: Vec<String> = Vec::new();
    let mut found_branches: Vec<String> = Vec::new();

    for branch_name_to_check in branches_to_delete {
        if repo
            .find_branch(branch_name_to_check, BranchType::Local)
            .is_ok()
        {
            found_branches.push(branch_name_to_check.clone());
        } else {
            not_found_branches.push(branch_name_to_check.clone());
        }
    }

    if !not_found_branches.is_empty() {
        return Err(BranchError::BranchesNotFound {
            message: format!(
                "Branch(es) not found: **{0}**. {1} still exist(s).",
                not_found_branches.join(", "),
                if found_branches.is_empty() {
                    "No branches were".to_string()
                } else {
                    format!("The branch(es) **{}**", found_branches.join(", "))
                }
            ),
            detail: format!(
                "Cannot find the following branches: {}. Path: {}",
                not_found_branches.join(", "),
                path.display()
            ),
        }
        .into());
    }

    if found_branches.is_empty() {
        return Ok(Vec::new()); // No branches to delete that were found
    }

    // Pre-flight: a branch that is checked out cannot be deleted, so reject the
    // whole batch before touching anything.
    let worktree_branches = branches_checked_out_in_worktrees(&repo);
    let mut blocked: Vec<(String, String)> = Vec::new();

    for branch_name in &found_branches {
        let branch = repo
            .find_branch(branch_name, BranchType::Local)
            .map_err(|e| BranchError::FindBranchFailed {
                name: branch_name.to_string(),
                source: e,
            })?;

        if branch.is_head() {
            blocked.push((
                branch_name.clone(),
                "it is the currently checked-out branch".to_string(),
            ));
        } else if let Some(worktree_path) = worktree_branches.get(branch_name) {
            blocked.push((
                branch_name.clone(),
                format!("it is checked out in the worktree at {}", worktree_path),
            ));
        }
    }

    if !blocked.is_empty() {
        let names: Vec<&str> = blocked.iter().map(|(name, _)| name.as_str()).collect();
        return Err(BranchError::BranchesInUse {
            message: format!(
                "Cannot delete **{}**: the branch(es) are in use. No branches were deleted.",
                names.join(", ")
            ),
            detail: format!(
                "{}. Path: {}",
                blocked
                    .iter()
                    .map(|(name, reason)| format!(
                        "'{}' cannot be deleted because {}",
                        name, reason
                    ))
                    .collect::<Vec<_>>()
                    .join("; "),
                path.display()
            ),
        }
        .into());
    }

    let mut deleted_branches = Vec::new();

    for branch_name in &found_branches {
        // Get branch info before deletion for the return value
        let branch_info = get_branch_info(&repo, branch_name)?;

        // Find the branch
        let mut branch = repo
            .find_branch(branch_name, BranchType::Local)
            .map_err(|e| BranchError::FindBranchFailed {
                name: branch_name.to_string(),
                source: e,
            })?;

        // Delete the branch (force=true to match original -D flag behavior)
        branch
            .delete()
            .map_err(|e| BranchError::DeleteBranchFailed {
                name: branch_name.to_string(),
                source: e,
            })?;

        // Clone branch_info.last_commit.short_sha to avoid borrowing after move
        let short_sha = branch_info.last_commit.short_sha.clone();

        deleted_branches.push(DeletedBranchInfo {
            branch: branch_info,
            raw_output: format!("Deleted branch {} (was {})", branch_name, short_sha),
        });
    }

    Ok(deleted_branches)
}

fn get_branch_info(repo: &Repository, branch_name: &str) -> Result<Branch, AppError> {
    let branch = repo
        .find_branch(branch_name, BranchType::Local)
        .map_err(|e| BranchError::FindBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    let reference = branch.get();
    let commit = reference
        .peel_to_commit()
        .map_err(|e| BranchError::CommitPeelFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    let author = commit.author();

    let date_str = super::commit::format_commit_time(commit.time());

    let sha = commit.id().to_string();
    let short_sha = super::commit::short_sha(&sha);

    // Store the full commit message (subject + body) plus its subject line.
    let message = commit.message().unwrap_or("").trim_end().to_string();
    let summary = commit.summary().unwrap_or("").to_string();

    // Remote tracking ref (e.g. "origin/main"); `None` when unset.
    let upstream = branch
        .upstream()
        .ok()
        .and_then(|up| up.name().ok().flatten().map(str::to_string));

    let author_name = author.name().unwrap_or("").to_string();
    let author_email = author.email().unwrap_or("").to_string();

    // Check if branch is fully merged
    let is_merged = is_branch_merged(repo, branch_name)?;

    // Check if it's the current branch
    let head = repo
        .head()
        .map_err(|e| BranchError::HeadNotFound { source: e })?;

    let current = head.is_branch()
        && head
            .shorthand()
            .map(|name| name == branch_name)
            .unwrap_or(false);

    Ok(Branch {
        name: branch_name.to_string(),
        fully_merged: is_merged,
        current,
        upstream,
        last_commit: Commit {
            sha,
            short_sha,
            date: date_str,
            message,
            summary,
            author: author_name,
            email: author_email,
        },
        deleted_at: None,
        is_reachable: None,
        is_selected: false,
        is_locked: false,
    })
}

pub fn restore_deleted_branch(
    path: &Path,
    branch_info: &DeletedBranch,
    app_handle: Option<&tauri::AppHandle>,
) -> Result<RestoreBranchResult, AppError> {
    // Fail with a precise error when the path isn't a repository at all; the
    // helpers below open their own handles.
    Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    // Check if the commit exists in the repository
    if !is_commit_reachable(path, &branch_info.commit_sha)? {
        return Err(BranchError::CommitNotFoundInRepo {
            sha: branch_info.commit_sha.to_string(),
            path: path.display().to_string(),
        }
        .into());
    }

    // Check if target branch already exists
    let target_branch_exists = branch_exists(path, &branch_info.target_name)?;

    if target_branch_exists {
        // Handle conflict based on user's preference
        match &branch_info.conflict_resolution {
            Some(ConflictResolution::Overwrite) => {
                // Force-create: one atomic ref update. Deleting first and then
                // creating meant a failure in between (a bad SHA, a locked ref)
                // destroyed the branch the user was overwriting.
                create_branch_at_commit(
                    path,
                    &branch_info.target_name,
                    &branch_info.commit_sha,
                    true,
                    app_handle,
                )
            }
            Some(ConflictResolution::Rename) => {
                // Create with new name
                create_branch_at_commit(
                    path,
                    &branch_info.target_name,
                    &branch_info.commit_sha,
                    false,
                    app_handle,
                )
            }
            Some(ConflictResolution::Skip) => Ok(RestoreBranchResult {
                success: false,
                branch_name: branch_info.target_name.clone(),
                message: format!("Skipped creation of branch '{}'", branch_info.target_name),
                requires_user_action: false,
                conflict_details: None,
                skipped: true,
                branch: None,
            }),
            None => {
                // No conflict resolution strategy, ask user
                Ok(RestoreBranchResult {
                    success: false,
                    branch_name: branch_info.target_name.clone(),
                    message: format!(
                        "Branch '{}' already exists. Please choose a conflict resolution strategy.",
                        branch_info.target_name
                    ),
                    requires_user_action: true,
                    conflict_details: Some(ConflictDetails {
                        original_name: branch_info.original_name.clone(),
                        conflicting_name: branch_info.target_name.clone(),
                    }),
                    skipped: false,
                    branch: None,
                })
            }
        }
    } else {
        // No conflict, create the branch
        create_branch_at_commit(
            path,
            &branch_info.target_name,
            &branch_info.commit_sha,
            false,
            app_handle,
        )
    }
}

/// Creates `branch_name` at `commit_sha`. With `force`, an existing branch of
/// that name is replaced in a single ref update rather than deleted first.
fn create_branch_at_commit(
    path: &Path,
    branch_name: &str,
    commit_sha: &str,
    force: bool,
    app_handle: Option<&tauri::AppHandle>,
) -> Result<RestoreBranchResult, AppError> {
    let repo = Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })?;

    // Resolve strictly by object id - never through the revspec grammar, so a
    // value like "HEAD" or a branch name cannot masquerade as a SHA.
    let commit = super::commit::find_commit_by_sha(&repo, commit_sha).map_err(|e| {
        BranchError::FindCommitFailed {
            sha: commit_sha.to_string(),
            source: e,
        }
    })?;

    repo.branch(branch_name, &commit, force)
        .map_err(|e| BranchError::CreateBranchFailed {
            name: branch_name.to_string(),
            source: e,
        })?;

    // Get the branch info after creation
    let branch_info = get_branch_info(&repo, branch_name)?;

    // Emit event for branch restoration if we have an app handle
    if let Some(handle) = app_handle {
        let _ = handle.emit("branch-restored", branch_name);
    }

    Ok(RestoreBranchResult {
        success: true,
        branch_name: branch_name.to_string(),
        message: format!(
            "Branch '{}' has been successfully restored at commit {}",
            branch_name, commit_sha
        ),
        requires_user_action: false,
        conflict_details: None,
        skipped: false,
        branch: Some(branch_info),
    })
}

/// Restores each branch independently. A failure is recorded as that entry's
/// result instead of aborting the batch: propagating the first error threw
/// away the outcomes of every branch already restored, so the caller could
/// neither report them nor mark them active in the database.
pub fn restore_deleted_branches(
    path: &Path,
    branch_infos: &[DeletedBranch],
    app_handle: Option<&tauri::AppHandle>,
) -> Result<Vec<(String, RestoreBranchResult)>, AppError> {
    let mut results = Vec::new();

    for branch_info in branch_infos {
        let result = match restore_deleted_branch(path, branch_info, app_handle) {
            Ok(result) => result,
            Err(error) => RestoreBranchResult {
                success: false,
                branch_name: branch_info.target_name.clone(),
                message: error.message.clone(),
                requires_user_action: false,
                conflict_details: None,
                skipped: false,
                branch: None,
            },
        };
        results.push((branch_info.target_name.clone(), result));
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{run_git, setup_test_repo, DirectoryGuard};

    #[test]
    fn test_parse_shortstat() {
        assert_eq!(
            parse_shortstat(" 3 files changed, 10 insertions(+), 2 deletions(-)"),
            (10, 2)
        );
        assert_eq!(parse_shortstat(" 1 file changed, 1 insertion(+)"), (1, 0));
        assert_eq!(parse_shortstat(" 1 file changed, 4 deletions(-)"), (0, 4));
        assert_eq!(parse_shortstat(""), (0, 0));
        assert_eq!(parse_shortstat("garbage output"), (0, 0));
    }

    #[test]
    fn test_cli_and_libgit2_metrics_agree() {
        let _guard = DirectoryGuard::new();
        let repo_dir = setup_test_repo();
        let path = repo_dir.path();

        // One diverged branch, one merged branch (points at an ancestor).
        crate::shared::utils::test_utils::git_command()
            .args(["branch", "merged-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", "diverged-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        std::fs::write(path.join("diverged.txt"), "one\ntwo\n").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "diverge"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "main"])
            .current_dir(path)
            .output()
            .unwrap();

        let repo = Repository::open(path).unwrap();
        for name in ["merged-branch", "diverged-branch"] {
            let cli = branch_metrics_via_git_cli(path, name).expect("cli path should resolve");
            let lib = branch_metrics_in_repo(&repo, name).expect("libgit2 path should resolve");
            assert_eq!(cli.is_merged, lib.is_merged, "{name}: merge status");
            assert_eq!(cli.lines_added, lib.lines_added, "{name}: lines added");
            assert_eq!(
                cli.lines_removed, lib.lines_removed,
                "{name}: lines removed"
            );
        }

        // Unresolvable branch: CLI declines, so the caller can fall back.
        assert!(branch_metrics_via_git_cli(path, "no-such-branch").is_none());
    }

    #[test]
    fn test_branch_exists() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let result = branch_exists(path, &current_branch_name);
        assert!(result.is_ok());
        assert!(result.unwrap());

        let result = branch_exists(path, "non-existent-branch");
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_find_current_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let expected = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let current = find_current_branch(path);
        assert!(
            current.is_ok(),
            "find_current_branch failed: {:?}",
            current.err()
        );
        assert_eq!(current.unwrap(), Some(expected));
    }

    /// A detached HEAD is not an error: the lookup reports "no current
    /// branch" and the listing still resolves every branch, none of them
    /// marked `current`.
    #[test]
    fn test_detached_head_is_tolerated() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        crate::shared::utils::test_utils::git_command()
            .args(["branch", "side"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "--detach"])
            .current_dir(path)
            .output()
            .unwrap();

        assert_eq!(find_current_branch(path).unwrap(), None);

        let branches = get_all_branches_with_last_commit(path).expect("listing tolerates detach");
        assert!(!branches.is_empty());
        assert!(
            branches.iter().all(|b| !b.current),
            "no branch is current while HEAD is detached"
        );
        assert!(branches.iter().any(|b| b.name == "side"));

        let fast = get_all_branches_with_last_commit_fast(path).expect("fast listing tolerates");
        assert!(fast.iter().all(|b| !b.current));
    }

    #[test]
    fn test_get_all_branches_with_last_commit() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let branches_result = get_all_branches_with_last_commit(path);
        assert!(
            branches_result.is_ok(),
            "get_all_branches_with_last_commit failed: {:?}",
            branches_result.err()
        );
        let branches = branches_result.unwrap();

        assert!(!branches.is_empty(), "No branches returned");

        let current_branch_opt = branches.iter().find(|b| b.name == current_branch_name);
        assert!(
            current_branch_opt.is_some(),
            "Current branch not found in results"
        );
        let current_branch_obj = current_branch_opt.unwrap();
        assert!(
            current_branch_obj.current,
            "Current branch not marked as current"
        );

        assert!(
            !current_branch_obj.last_commit.sha.is_empty(),
            "Commit SHA is empty"
        );
        assert!(
            !current_branch_obj.last_commit.message.is_empty(),
            "Commit message is empty"
        );
        assert!(
            !current_branch_obj.last_commit.summary.is_empty(),
            "Commit summary is empty"
        );
        // A repo with no configured remote has no upstream.
        assert!(
            current_branch_obj.upstream.is_none(),
            "Expected no upstream on a fresh repo without a remote"
        );
    }

    #[test]
    fn test_last_commit_keeps_full_message_and_subject_summary() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Commit a multi-line message so summary (subject) and message (subject +
        // body) diverge.
        std::fs::write(path.join("body-file.txt"), "content").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args([
                "commit",
                "-m",
                "feat: subject line",
                "-m",
                "Detailed body paragraph.",
            ])
            .current_dir(path)
            .output()
            .unwrap();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let branches = get_all_branches_with_last_commit(path).unwrap();
        let branch = branches
            .iter()
            .find(|b| b.name == current_branch_name)
            .expect("current branch missing");

        assert_eq!(branch.last_commit.summary, "feat: subject line");
        assert!(
            branch.last_commit.message.contains("feat: subject line"),
            "full message should retain the subject"
        );
        assert!(
            branch
                .last_commit
                .message
                .contains("Detailed body paragraph."),
            "full message should retain the body"
        );
        // `trim_end` drops git's trailing newline.
        assert!(
            !branch.last_commit.message.ends_with('\n'),
            "message should not carry a trailing newline"
        );
    }

    #[test]
    fn test_switch_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let original_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let create_output = crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", "test-switch-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(
            create_output.status.success(),
            "Failed to create test-switch-branch: {}",
            String::from_utf8_lossy(&create_output.stderr)
        );

        let result = switch_branch(path, &original_branch);
        assert!(
            result.is_ok(),
            "Failed to switch back to original: {:?}",
            result.err()
        );
        assert_eq!(
            result.unwrap(),
            original_branch,
            "Returned branch name mismatch after switching back"
        );

        let result = switch_branch(path, "test-switch-branch");
        assert!(
            result.is_ok(),
            "Failed to switch to test-switch-branch: {:?}",
            result.err()
        );
        assert_eq!(
            result.unwrap(),
            "test-switch-branch",
            "Returned branch name mismatch after switching to test branch"
        );
    }

    #[test]
    fn test_switch_branch_refuses_to_discard_uncommitted_changes() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let original_branch = {
            let output = crate::shared::utils::test_utils::git_command()
                .args(["branch", "--show-current"])
                .current_dir(path)
                .output()
                .unwrap();
            String::from_utf8(output.stdout).unwrap().trim().to_string()
        };

        // A second branch whose tip changes test.txt.
        run_git(path, &["checkout", "-b", "other"]);
        std::fs::write(path.join("test.txt"), "committed on other\n").unwrap();
        run_git(path, &["commit", "-am", "change test.txt"]);
        run_git(path, &["checkout", &original_branch]);

        // Uncommitted local edit to the same file.
        std::fs::write(path.join("test.txt"), "my uncommitted work\n").unwrap();

        let result = switch_branch(path, "other");
        assert!(
            result.is_err(),
            "switch must refuse to overwrite local changes"
        );

        // Nothing was lost and HEAD did not move.
        assert_eq!(
            std::fs::read_to_string(path.join("test.txt")).unwrap(),
            "my uncommitted work\n"
        );
        let head = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        assert_eq!(
            String::from_utf8(head.stdout).unwrap().trim(),
            original_branch
        );
    }

    #[test]
    fn test_delete_branches() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch_name = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let branch_to_delete_name = "test-branch-to-delete";
        let create_output = crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", branch_to_delete_name])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(
            create_output.status.success(),
            "Failed to create {}: {}",
            branch_to_delete_name,
            String::from_utf8_lossy(&create_output.stderr)
        );

        // Switch back to delete
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", &current_branch_name])
            .current_dir(path)
            .output()
            .unwrap();

        let branches_to_delete = vec![branch_to_delete_name.to_string()];
        let result = delete_branches(path, &branches_to_delete);
        assert!(result.is_ok(), "delete_branches failed: {:?}", result.err());

        let verify_delete_result = branch_exists(path, branch_to_delete_name);
        assert!(
            !verify_delete_result.unwrap_or(true),
            "Branch should have been deleted"
        );
    }

    /// The batch is all-or-nothing: naming the checked-out branch alongside a
    /// deletable one deletes neither.
    #[test]
    fn test_delete_branches_rejects_the_head_branch_without_deleting_anything() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let current = run_git(path, &["branch", "--show-current"]);
        run_git(path, &["branch", "safe-to-delete"]);

        let err = delete_branches(path, &["safe-to-delete".to_string(), current.clone()])
            .expect_err("deleting the current branch must be refused");

        assert_eq!(err.kind, "branches_in_use");
        assert!(err.message.contains(&current), "message names the branch");
        assert!(
            branch_exists(path, "safe-to-delete").unwrap(),
            "no branch is deleted when the batch is rejected"
        );
        assert!(branch_exists(path, &current).unwrap());
    }

    /// A branch checked out in a linked worktree is equally undeletable, and
    /// the refusal names the worktree so the user knows where it is in use.
    #[test]
    fn test_delete_branches_rejects_a_branch_checked_out_in_a_worktree() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        run_git(path, &["branch", "safe-to-delete"]);
        let worktree_dir = tempfile::tempdir().unwrap();
        let worktree_path = worktree_dir.path().join("linked");
        run_git(
            path,
            &[
                "worktree",
                "add",
                "-b",
                "in-worktree",
                worktree_path.to_str().unwrap(),
            ],
        );

        let git_repo = Repository::open(path).unwrap();
        let checked_out = branches_checked_out_in_worktrees(&git_repo);
        assert!(
            checked_out.contains_key("in-worktree"),
            "worktree checkout is detected: {checked_out:?}"
        );

        let err = delete_branches(
            path,
            &["safe-to-delete".to_string(), "in-worktree".to_string()],
        )
        .expect_err("deleting a worktree-checked-out branch must be refused");

        assert_eq!(err.kind, "branches_in_use");
        assert!(err.message.contains("in-worktree"));
        assert!(branch_exists(path, "safe-to-delete").unwrap());
        assert!(branch_exists(path, "in-worktree").unwrap());
    }

    /// A repository with no worktrees yields an empty map rather than an error.
    #[test]
    fn test_branches_checked_out_in_worktrees_without_worktrees() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let git_repo = Repository::open(repo.path()).unwrap();
        assert!(branches_checked_out_in_worktrees(&git_repo).is_empty());
    }

    /// A detached worktree contributes no branch name.
    #[test]
    fn test_branches_checked_out_in_worktrees_ignores_detached_worktrees() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let worktree_dir = tempfile::tempdir().unwrap();
        let worktree_path = worktree_dir.path().join("detached");
        run_git(
            path,
            &[
                "worktree",
                "add",
                "--detach",
                worktree_path.to_str().unwrap(),
            ],
        );

        let git_repo = Repository::open(path).unwrap();
        assert!(branches_checked_out_in_worktrees(&git_repo).is_empty());
    }

    /// A worktree whose directory has been removed but not pruned is skipped
    /// rather than failing the whole pre-flight.
    #[test]
    fn test_branches_checked_out_in_worktrees_skips_unreadable_worktrees() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let worktree_dir = tempfile::tempdir().unwrap();
        let worktree_path = worktree_dir.path().join("gone");
        run_git(
            path,
            &[
                "worktree",
                "add",
                "-b",
                "orphaned",
                worktree_path.to_str().unwrap(),
            ],
        );
        std::fs::remove_dir_all(&worktree_path).unwrap();

        let git_repo = Repository::open(path).unwrap();
        assert!(branches_checked_out_in_worktrees(&git_repo).is_empty());

        // And the branch it used to hold is deletable again.
        assert!(delete_branches(path, &["orphaned".to_string()]).is_ok());
    }

    /// Naming a branch that does not exist rejects the batch before any
    /// deletion, leaving the existing branches untouched.
    #[test]
    fn test_delete_branches_rejects_unknown_names_without_deleting_anything() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        run_git(path, &["branch", "safe-to-delete"]);

        let err = delete_branches(
            path,
            &["safe-to-delete".to_string(), "no-such-branch".to_string()],
        )
        .expect_err("unknown branch names must be refused");

        assert_eq!(err.kind, "branches_not_found");
        assert!(branch_exists(path, "safe-to-delete").unwrap());

        // With nothing found at all the message reports that no branches were
        // deleted.
        let err = delete_branches(path, &["no-such-branch".to_string()])
            .expect_err("unknown branch names must be refused");
        assert!(err.message.contains("No branches were"));
    }

    /// An empty request is a no-op, not an error.
    #[test]
    fn test_delete_branches_with_no_names() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        assert!(delete_branches(repo.path(), &[]).unwrap().is_empty());
    }

    #[test]
    fn test_restore_deleted_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

        let branch_to_delete_name = "branch-for-restore-test";

        crate::shared::utils::test_utils::git_command()
            .args(["branch", branch_to_delete_name, &commit_sha])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(branch_exists(path, branch_to_delete_name).unwrap());

        crate::shared::utils::test_utils::git_command()
            .args(["branch", "-D", branch_to_delete_name])
            .current_dir(path)
            .output()
            .unwrap();
        assert!(!branch_exists(path, branch_to_delete_name).unwrap());

        let restore_input = DeletedBranch {
            original_name: branch_to_delete_name.to_string(),
            target_name: branch_to_delete_name.to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &restore_input, None);
        assert!(result.is_ok(), "Restore failed: {:?}", result.err());
        let restore_result = result.unwrap();
        assert!(
            restore_result.success,
            "Restore was not successful: {}",
            restore_result.message
        );
        assert_eq!(restore_result.branch_name, branch_to_delete_name);
        assert!(!restore_result.skipped);
        assert!(branch_exists(path, branch_to_delete_name).unwrap());

        // Test conflict
        let conflict_input = DeletedBranch {
            original_name: "some-other-original-name".to_string(),
            target_name: branch_to_delete_name.to_string(), // This now exists
            commit_sha: commit_sha.clone(),
            conflict_resolution: None, // No resolution strategy
        };
        let result = restore_deleted_branch(path, &conflict_input, None);
        assert!(result.is_ok());
        let conflict_result = result.unwrap();
        assert!(!conflict_result.success);
        assert!(conflict_result.requires_user_action);
        assert!(conflict_result.conflict_details.is_some());
        assert_eq!(
            conflict_result.conflict_details.unwrap().conflicting_name,
            branch_to_delete_name
        );

        // Test skip conflict resolution
        let skip_input = DeletedBranch {
            original_name: "another-original".to_string(),
            target_name: branch_to_delete_name.to_string(), // Still exists
            commit_sha: commit_sha.clone(),
            conflict_resolution: Some(ConflictResolution::Skip),
        };
        let result = restore_deleted_branch(path, &skip_input, None);
        assert!(result.is_ok());
        let skip_result = result.unwrap();
        assert!(skip_result.skipped, "Branch should have been skipped");
        // Depending on strict interpretation, success might be true or false. Message is key.
        assert!(skip_result.message.contains("Skipped creation of branch"));
    }

    #[test]
    fn test_get_all_branches_with_last_commit_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();
        let result = get_all_branches_with_last_commit(non_git_path);
        assert!(result.is_err(), "Expected error for non-git directory");

        let malformed_repo = tempfile::tempdir().unwrap();
        let malformed_path = malformed_repo.path();
        std::fs::create_dir(malformed_path.join(".git")).unwrap();
        let result = get_all_branches_with_last_commit(malformed_path);
        assert!(result.is_err(), "Expected error for malformed git repo");
    }

    /// A repository with no commits at all (unborn HEAD) describes cleanly:
    /// no current branch and an empty branch list, not an error. Adding such a
    /// repository used to fail with a raw libgit2 message.
    #[test]
    fn test_unborn_head_lists_no_branches() {
        let _guard = DirectoryGuard::new();
        let empty = tempfile::tempdir().unwrap();
        crate::shared::utils::test_utils::run_git(empty.path(), &["init"]);

        assert_eq!(find_current_branch(empty.path()).unwrap(), None);
        assert!(get_all_branches_with_last_commit(empty.path())
            .expect("listing tolerates an unborn HEAD")
            .is_empty());
        assert!(get_all_branches_with_last_commit_fast(empty.path())
            .expect("fast listing tolerates an unborn HEAD")
            .is_empty());
    }

    #[test]
    fn test_find_current_branch_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();
        let result = find_current_branch(non_git_path);
        assert!(result.is_err(), "Expected error for non-git directory");

        // An initialised repository with no commits has an unborn HEAD: not an
        // error, just "no branch is current".
        let empty = tempfile::tempdir().unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["init"])
            .current_dir(empty.path())
            .output()
            .unwrap();
        assert_eq!(find_current_branch(empty.path()).unwrap(), None);
    }

    #[test]
    fn test_branch_exists_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();
        let result = branch_exists(non_git_path, "main");
        assert!(
            result.is_ok(),
            "branch_exists should handle non-git directories gracefully by returning Ok(false)"
        );
        assert!(!result.unwrap());

        let malformed_repo = tempfile::tempdir().unwrap();
        let malformed_path = malformed_repo.path();
        std::fs::create_dir(malformed_path.join(".git")).unwrap();
        let result = branch_exists(malformed_path, "main");
        assert!(
            result.is_ok(),
            "branch_exists should handle malformed repos gracefully by returning Ok(false)"
        );
        assert!(!result.unwrap());
    }

    #[test]
    fn test_restore_deleted_branch_with_overwrite() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let commit_output = crate::shared::utils::test_utils::git_command()
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        let test_branch_name = "test-overwrite-branch";
        let conflict_branch_name = "existing-conflict-branch";

        // Attempt to restore 'test_branch_name' but name it 'conflict_branch_name' (which exists) using Overwrite
        let restore_info = DeletedBranch {
            original_name: test_branch_name.to_string(),
            target_name: conflict_branch_name.to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: Some(ConflictResolution::Overwrite),
        };

        let result = restore_deleted_branch(path, &restore_info, None);
        assert!(
            result.is_ok(),
            "Restore with overwrite failed: {:?}",
            result.err()
        );
        let restore_result = result.unwrap();
        assert!(
            restore_result.success,
            "Restore with overwrite not successful: {}",
            restore_result.message
        );
        assert_eq!(restore_result.branch_name, conflict_branch_name);
        assert!(branch_exists(path, conflict_branch_name).unwrap());

        // Ensure original test_branch_name does not exist (as it was restored as conflict_branch_name)
        assert!(!branch_exists(path, test_branch_name).unwrap_or(true));
    }

    #[test]
    fn test_git_command_error_handling() {
        let _guard = DirectoryGuard::new();
        let non_existent_path = Path::new("/non/existent/path/hopefully");

        let result_branches = get_all_branches_with_last_commit(non_existent_path);
        assert!(result_branches.is_err());
        if let Err(e) = result_branches {
            assert!(e.message.contains("Unable to access the path"));
            assert_eq!(e.kind, "unable_to_access_dir");
        }

        // Note: Testing permission errors is tricky and platform-dependent.
        // The original test for no_permission_path is kept here for conceptual completeness
        // but might be unreliable in CI or different environments.
        let temp_dir_perm = tempfile::tempdir().unwrap();
        let no_permission_path = temp_dir_perm.path();

        #[cfg(unix)]
        {
            use std::fs;
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(no_permission_path).unwrap().permissions();
            perms.set_mode(0o000); // Remove all permissions
            fs::set_permissions(no_permission_path, perms).unwrap();
        }

        // This check might fail if git is not installed or if the permissions test doesn't work as expected
        // For CI, it might be better to mock Command execution or test specific error mapping logic.
        let result_perm_branches = get_all_branches_with_last_commit(no_permission_path);
        if cfg!(unix) {
            // Only assert this on unix where we tried to set no permissions
            assert!(result_perm_branches.is_err());
            if let Err(e) = result_perm_branches {
                assert!(
                    e.message.contains("Unable to access the path")
                        || e.message.contains("Failed to execute git command")
                        || e.message.contains("Failed to open git repository")
                );
                // The error kind might vary depending on how git itself or the OS handles this.
                // "unable_to_access_dir" is if the current_dir fails,
                // "command_execution_failed" if git fails to run for other permission reasons.
                assert!(
                    e.kind == "unable_to_access_dir"
                        || e.kind == "command_execution_failed"
                        || e.kind == "repository_open_failed"
                );
            }
        }
    }

    #[test]
    fn test_restore_deleted_branches() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Get current commit SHA
        let commit_output = crate::shared::utils::test_utils::git_command()
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        // Create and delete test branches
        let branch_names = vec!["test-branch-1", "test-branch-2", "test-branch-3"];
        for branch_name in &branch_names {
            crate::shared::utils::test_utils::git_command()
                .args(["branch", branch_name, &commit_sha])
                .current_dir(path)
                .output()
                .unwrap();
            crate::shared::utils::test_utils::git_command()
                .args(["branch", "-D", branch_name])
                .current_dir(path)
                .output()
                .unwrap();
        }

        // Create restore inputs
        let restore_inputs: Vec<DeletedBranch> = branch_names
            .iter()
            .map(|name| DeletedBranch {
                original_name: name.to_string(),
                target_name: name.to_string(),
                commit_sha: commit_sha.clone(),
                conflict_resolution: None,
            })
            .collect();

        // Test successful restore of all branches
        let result = restore_deleted_branches(path, &restore_inputs, None);
        assert!(result.is_ok(), "Restore failed: {:?}", result.err());
        let restore_results = result.unwrap();
        assert_eq!(restore_results.len(), branch_names.len());

        // Verify all branches were restored successfully
        for (name, result) in restore_results {
            assert!(
                result.success,
                "Branch {} restore failed: {}",
                name, result.message
            );
            assert!(!result.skipped);
            assert!(branch_exists(path, &name).unwrap());
        }

        // Test restore with conflicts
        let conflict_inputs = vec![
            DeletedBranch {
                original_name: "conflict-original-1".to_string(),
                target_name: branch_names[0].to_string(), // This now exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: None,
            },
            DeletedBranch {
                original_name: "conflict-original-2".to_string(),
                target_name: branch_names[1].to_string(), // This now exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Skip),
            },
        ];

        let result = restore_deleted_branches(path, &conflict_inputs, None);
        assert!(
            result.is_ok(),
            "Restore with conflicts failed: {:?}",
            result.err()
        );
        let conflict_results = result.unwrap();
        assert_eq!(conflict_results.len(), conflict_inputs.len());

        // Verify conflict handling
        for (_name, result) in conflict_results {
            if result.conflict_details.is_some() {
                assert!(!result.success);
                assert!(result.requires_user_action);
            } else if result.skipped {
                assert!(result.message.contains("Skipped creation of branch"));
            }
        }

        // Test restore with overwrite
        let overwrite_inputs = vec![
            DeletedBranch {
                original_name: "overwrite-original-1".to_string(),
                target_name: branch_names[0].to_string(), // This exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Overwrite),
            },
            DeletedBranch {
                original_name: "overwrite-original-2".to_string(),
                target_name: branch_names[1].to_string(), // This exists
                commit_sha: commit_sha.clone(),
                conflict_resolution: Some(ConflictResolution::Overwrite),
            },
        ];

        let result = restore_deleted_branches(path, &overwrite_inputs, None);
        assert!(
            result.is_ok(),
            "Restore with overwrite failed: {:?}",
            result.err()
        );
        let overwrite_results = result.unwrap();
        assert_eq!(overwrite_results.len(), overwrite_inputs.len());

        // Verify overwrite handling
        for (name, result) in overwrite_results {
            assert!(
                result.success,
                "Overwrite failed for {}: {}",
                name, result.message
            );
            assert!(!result.skipped);
            assert!(branch_exists(path, &name).unwrap());
        }
    }

    /// A failing entry is reported as a failed result, not as an aborted
    /// batch: the branches restored before and after it survive.
    #[test]
    fn test_restore_deleted_branches_records_per_item_failures() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();
        let head_sha = run_git(path, &["rev-parse", "HEAD"]);

        let inputs = vec![
            DeletedBranch {
                original_name: "first".to_string(),
                target_name: "first".to_string(),
                commit_sha: head_sha.clone(),
                conflict_resolution: None,
            },
            DeletedBranch {
                original_name: "broken".to_string(),
                target_name: "broken".to_string(),
                commit_sha: "invalid-sha".to_string(),
                conflict_resolution: None,
            },
            DeletedBranch {
                original_name: "third".to_string(),
                target_name: "third".to_string(),
                commit_sha: head_sha.clone(),
                conflict_resolution: None,
            },
        ];

        let results = restore_deleted_branches(path, &inputs, None)
            .expect("a failing entry must not abort the batch");

        assert_eq!(results.len(), 3);
        assert!(results[0].1.success, "the first branch is restored");
        assert!(!results[1].1.success, "the broken entry is reported failed");
        assert!(!results[1].1.message.is_empty());
        assert!(results[2].1.success, "later entries still run");

        assert!(branch_exists(path, "first").unwrap());
        assert!(!branch_exists(path, "broken").unwrap());
        assert!(branch_exists(path, "third").unwrap());
    }

    /// A directory that isn't a repository fails every entry rather than
    /// erroring the call.
    #[test]
    fn test_restore_deleted_branches_in_a_non_repository() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();

        let restore_inputs = vec![DeletedBranch {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "invalid-sha".to_string(),
            conflict_resolution: None,
        }];

        let results = restore_deleted_branches(temp_dir.path(), &restore_inputs, None).unwrap();
        assert_eq!(results.len(), 1);
        assert!(!results[0].1.success);
    }

    /// Overwrite is a single force-create: the branch never stops existing,
    /// and it ends up on the requested commit.
    #[test]
    fn test_restore_with_overwrite_is_atomic() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let first_sha = run_git(path, &["rev-parse", "HEAD"]);
        run_git(path, &["branch", "conflicting"]);
        let second_sha = crate::shared::utils::test_utils::commit_file(
            path,
            "second.txt",
            "second\n",
            "second commit",
            "2024-01-02T00:00:00+00:00",
        );
        assert_ne!(first_sha, second_sha);

        // A blob's SHA exists in the object database but is not a commit, so
        // it passes the reachability guard and only fails when the branch is
        // actually created - exactly where the old delete-then-create left the
        // branch destroyed.
        let blob_sha = run_git(path, &["rev-parse", "HEAD:test.txt"]);
        let doomed = DeletedBranch {
            original_name: "conflicting".to_string(),
            target_name: "conflicting".to_string(),
            commit_sha: blob_sha,
            conflict_resolution: Some(ConflictResolution::Overwrite),
        };
        assert!(restore_deleted_branch(path, &doomed, None).is_err());
        assert!(
            branch_exists(path, "conflicting").unwrap(),
            "a failed overwrite must not destroy the branch"
        );
        assert_eq!(
            run_git(path, &["rev-parse", "conflicting"]),
            first_sha,
            "the branch still points at its original commit"
        );

        // A successful overwrite moves it to the requested commit.
        let overwrite = DeletedBranch {
            original_name: "conflicting".to_string(),
            target_name: "conflicting".to_string(),
            commit_sha: second_sha.clone(),
            conflict_resolution: Some(ConflictResolution::Overwrite),
        };
        let result = restore_deleted_branch(path, &overwrite, None).unwrap();
        assert!(result.success);
        assert_eq!(run_git(path, &["rev-parse", "conflicting"]), second_sha);
    }

    #[test]
    fn test_restore_deleted_branch_errors() {
        let _guard = DirectoryGuard::new();
        let temp_dir = tempfile::tempdir().unwrap();
        let non_git_path = temp_dir.path();

        // Test with non-git directory
        let restore_input = DeletedBranch {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "invalid-sha".to_string(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(non_git_path, &restore_input, None);
        assert!(result.is_err(), "Expected error for non-git directory");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to open git repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "repository_open_failed");
        }

        // Test with invalid commit SHA
        let repo = setup_test_repo();
        let path = repo.path();
        let result = restore_deleted_branch(path, &restore_input, None);
        assert!(result.is_err(), "Expected error for invalid commit SHA");
        if let Err(e) = result {
            assert!(
                e.message
                    .contains("Commit **invalid-sha** not found in the repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "commit_not_found");
        }

        // Test with non-existent commit
        let restore_input = DeletedBranch {
            original_name: "test-branch".to_string(),
            target_name: "test-branch".to_string(),
            commit_sha: "0000000000000000000000000000000000000000".to_string(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &restore_input, None);
        assert!(result.is_err(), "Expected error for non-existent commit");
        if let Err(e) = result {
            assert!(
                e.message.contains("Commit **0000000000000000000000000000000000000000** not found in the repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "commit_not_found");
        }

        // Test with malformed repository
        let malformed_repo = tempfile::tempdir().unwrap();
        let malformed_path = malformed_repo.path();
        std::fs::create_dir(malformed_path.join(".git")).unwrap();

        let result = restore_deleted_branch(malformed_path, &restore_input, None);
        assert!(result.is_err(), "Expected error for malformed repository");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to open git repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "repository_open_failed");
        }

        // Test with permission denied
        #[cfg(unix)]
        {
            use std::fs;
            use std::os::unix::fs::PermissionsExt;
            let temp_dir_perm = tempfile::tempdir().unwrap();
            let no_permission_path = temp_dir_perm.path();
            let mut perms = fs::metadata(no_permission_path).unwrap().permissions();
            perms.set_mode(0o000); // Remove all permissions
            fs::set_permissions(no_permission_path, perms).unwrap();

            let result = restore_deleted_branch(no_permission_path, &restore_input, None);
            assert!(result.is_err(), "Expected error for permission denied");
            if let Err(e) = result {
                assert!(
                    e.message.contains("Failed to open git repository")
                        || e.message.contains("Failed to execute git command"),
                    "Unexpected error message: {}",
                    e.message
                );
                assert!(e.kind == "repository_open_failed" || e.kind == "command_execution_failed");
            }
        }

        // Test with invalid branch name
        let repo = setup_test_repo();
        let path = repo.path();
        let commit_output = crate::shared::utils::test_utils::git_command()
            .args(["rev-parse", "HEAD"])
            .current_dir(path)
            .output()
            .unwrap();
        let commit_sha = String::from_utf8(commit_output.stdout)
            .unwrap()
            .trim()
            .to_string();

        let invalid_branch_input = DeletedBranch {
            original_name: "test branch with spaces".to_string(), // Invalid branch name with spaces
            target_name: "test branch with spaces".to_string(),
            commit_sha: commit_sha.clone(),
            conflict_resolution: None,
        };

        let result = restore_deleted_branch(path, &invalid_branch_input, None);
        assert!(result.is_err(), "Expected error for invalid branch name");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to create branch"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "create_branch_failed");
        }
    }

    #[test]
    fn test_check_branch_merge_status() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        // Get current branch name
        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Test 1: Current branch should be "merged" (into itself)
        let result = check_branch_merge_status(path, &current_branch);
        assert!(
            result.is_ok(),
            "check_branch_merge_status failed: {:?}",
            result.err()
        );
        assert!(
            result.unwrap(),
            "Current branch should be considered merged"
        );

        // Test 2: Create a new branch from current and check it's merged
        let merged_branch = "test-merged-branch";
        crate::shared::utils::test_utils::git_command()
            .args(["branch", merged_branch])
            .current_dir(path)
            .output()
            .unwrap();

        let result = check_branch_merge_status(path, merged_branch);
        assert!(
            result.is_ok(),
            "Failed to check merged branch: {:?}",
            result.err()
        );
        assert!(
            result.unwrap(),
            "Branch created from HEAD should be considered merged"
        );

        // Test 3: Create a branch with new commits (unmerged)
        let unmerged_branch = "test-unmerged-branch";
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", unmerged_branch])
            .current_dir(path)
            .output()
            .unwrap();

        std::fs::write(path.join("new-file.txt"), "new content").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "New commit on unmerged branch"])
            .current_dir(path)
            .output()
            .unwrap();

        // Switch back to original branch
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", &current_branch])
            .current_dir(path)
            .output()
            .unwrap();

        let result = check_branch_merge_status(path, unmerged_branch);
        assert!(
            result.is_ok(),
            "Failed to check unmerged branch: {:?}",
            result.err()
        );
        assert!(
            !result.unwrap(),
            "Branch with new commits should not be considered merged"
        );

        // Test 4: Non-existent branch should return error
        let result = check_branch_merge_status(path, "non-existent-branch");
        assert!(result.is_err(), "Expected error for non-existent branch");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to find branch"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "branch_not_found");
        }

        // Test 5: Invalid path should return error
        let invalid_path = Path::new("/non/existent/path");
        let result = check_branch_merge_status(invalid_path, &current_branch);
        assert!(result.is_err(), "Expected error for invalid path");
        if let Err(e) = result {
            assert!(
                e.message.contains("Failed to open git repository"),
                "Unexpected error message: {}",
                e.message
            );
            assert_eq!(e.kind, "repository_open_failed");
        }
    }

    #[test]
    fn test_bulk_get_branch_metrics() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // Merged branch: points at HEAD, no own changes.
        crate::shared::utils::test_utils::git_command()
            .args(["branch", "bulk-merged-branch"])
            .current_dir(path)
            .output()
            .unwrap();

        // Unmerged branch with its own commit (adds 1 line in a new file).
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", "bulk-unmerged-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        std::fs::write(path.join("bulk-file.txt"), "one line\n").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "bulk metrics commit"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", &current_branch])
            .current_dir(path)
            .output()
            .unwrap();

        let names = vec![
            "bulk-merged-branch".to_string(),
            "bulk-unmerged-branch".to_string(),
            "does-not-exist".to_string(),
        ];
        let metrics = bulk_get_branch_metrics(path, &names).unwrap();

        // The missing branch is skipped, not an error.
        assert_eq!(metrics.len(), 2);

        let merged = metrics
            .iter()
            .find(|m| m.name == "bulk-merged-branch")
            .expect("merged branch missing");
        assert!(merged.is_merged);
        assert_eq!((merged.lines_added, merged.lines_removed), (0, 0));

        let unmerged = metrics
            .iter()
            .find(|m| m.name == "bulk-unmerged-branch")
            .expect("unmerged branch missing");
        assert!(!unmerged.is_merged);
        assert_eq!((unmerged.lines_added, unmerged.lines_removed), (1, 0));

        // Empty input → empty output.
        let empty = bulk_get_branch_metrics(path, &[]).unwrap();
        assert!(empty.is_empty());

        // Invalid path surfaces the repository-open error.
        let result = bulk_get_branch_metrics(Path::new("/non/existent/path"), &names);
        assert!(result.is_err());
        if let Err(e) = result {
            assert_eq!(e.kind, "repository_open_failed");
        }
    }

    #[test]
    fn test_get_branch_diff_stats() {
        let _guard = DirectoryGuard::new();
        let repo = setup_test_repo();
        let path = repo.path();

        let output = crate::shared::utils::test_utils::git_command()
            .args(["branch", "--show-current"])
            .current_dir(path)
            .output()
            .unwrap();
        let current_branch = String::from_utf8(output.stdout).unwrap().trim().to_string();

        // A branch pointing at HEAD has no unique changes.
        crate::shared::utils::test_utils::git_command()
            .args(["branch", "diff-noop-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        let stats = get_branch_diff_stats(path, "diff-noop-branch").unwrap();
        assert_eq!(stats, (0, 0), "Branch at HEAD should diff to (0, 0)");

        // The current branch diffs against itself.
        let stats = get_branch_diff_stats(path, &current_branch).unwrap();
        assert_eq!(stats, (0, 0), "Current branch should diff to (0, 0)");

        // A branch with its own commit: rewrite test.txt (1 line removed,
        // 3 added) and add extra.txt (2 added) → (5, 1).
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", "-b", "diff-stats-branch"])
            .current_dir(path)
            .output()
            .unwrap();
        std::fs::write(path.join("test.txt"), "line one\nline two\nline three\n").unwrap();
        std::fs::write(path.join("extra.txt"), "alpha\nbeta\n").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "Diff stats commit"])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["checkout", &current_branch])
            .current_dir(path)
            .output()
            .unwrap();

        let stats = get_branch_diff_stats(path, "diff-stats-branch").unwrap();
        assert_eq!(stats, (5, 1), "Expected (+5, -1) for the feature branch");

        // Commits HEAD gains after divergence must not count as removals: the
        // diff is taken from the merge-base, not from HEAD's tip.
        std::fs::write(path.join("head-only.txt"), "head only\n").unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["add", "."])
            .current_dir(path)
            .output()
            .unwrap();
        crate::shared::utils::test_utils::git_command()
            .args(["commit", "-m", "HEAD moves on"])
            .current_dir(path)
            .output()
            .unwrap();

        let stats = get_branch_diff_stats(path, "diff-stats-branch").unwrap();
        assert_eq!(
            stats,
            (5, 1),
            "HEAD-side commits should not affect the branch's diff stats"
        );

        // Non-existent branch surfaces the domain error.
        let result = get_branch_diff_stats(path, "non-existent-branch");
        assert!(result.is_err(), "Expected error for non-existent branch");
        if let Err(e) = result {
            assert_eq!(e.kind, "branch_not_found");
        }

        // Invalid path surfaces the repository-open error.
        let result = get_branch_diff_stats(Path::new("/non/existent/path"), &current_branch);
        assert!(result.is_err(), "Expected error for invalid path");
        if let Err(e) = result {
            assert_eq!(e.kind, "repository_open_failed");
        }
    }
}

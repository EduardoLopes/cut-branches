//! git2-backed commit-history walking with a per-repository session cache.
//!
//! Paging strategy: the first page of a repository pays one full revwalk that
//! collects only the topological `Oid` ordering (plus an index map and the
//! ref decorations). Every later page — and the deep-link window lookup — is
//! then O(limit) `find_commit` calls against that cached ordering, instead of
//! re-walking from the start (which is O(n²) across pages).
//!
//! Staleness: every call recomputes a digest over the sorted ref tips
//! (heads/remotes/tags + HEAD). The cache entry and the opaque page cursor
//! (`"{digest}:{offset}"`) both carry it; a digest mismatch on the cursor
//! means refs changed since that page was issued, so the caller restarts
//! from the first page (`BranchError::HistoryCursorStale`).
//!
//! Memory: the cached ordering costs roughly 60–100 bytes per commit (~1 MB
//! at 10k commits) and at most `MAX_CACHED_REPOS` repositories are retained.
//! If monorepo-scale histories ever matter, cap the ordering length and
//! degrade to cursor-only paging past the cap.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use git2::{BranchType, ObjectType, Oid, Repository, Sort};

use super::models::{
    BranchComparison, HistoryCommit, HistoryPage, HistoryWindow, RefDecoration, RefKind,
};
use crate::domains::branch_management::error::BranchError;
use crate::domains::branch_management::infrastructure::git::commit::{
    format_commit_time, short_sha,
};

/// How many repositories keep a cached ordering at once.
const MAX_CACHED_REPOS: usize = 4;

/// Upper bound for a single page/window request.
const MAX_PAGE_LIMIT: u32 = 500;

struct CachedHistory {
    digest: String,
    /// Full TOPOLOGICAL|TIME ordering, newest first.
    oids: Vec<Oid>,
    /// sha -> absolute index in `oids` (deep-link lookup).
    index: HashMap<Oid, u32>,
    /// Ref decorations per decorated commit, local branches first.
    decorations: HashMap<Oid, Vec<RefDecoration>>,
    /// Recency marker for eviction.
    last_used: Instant,
}

/// Tauri-managed session cache. Cheap to clone (shared interior).
#[derive(Clone, Default)]
pub struct HistoryCache(Arc<Mutex<HashMap<PathBuf, CachedHistory>>>);

/// Returns one page of commit history across all local branches (+ HEAD).
pub fn list_commit_history(
    cache: &HistoryCache,
    path: &Path,
    cursor: Option<&str>,
    limit: u32,
) -> Result<HistoryPage, BranchError> {
    let repo = open_repo(path)?;
    let digest = compute_refs_digest(&repo)?;

    let start = match cursor {
        None => 0,
        Some(raw) => {
            let (cursor_digest, offset) = parse_cursor(raw)?;
            if cursor_digest != digest {
                return Err(BranchError::HistoryCursorStale {
                    path: path.display().to_string(),
                });
            }
            offset
        }
    };

    let limit = limit.clamp(1, MAX_PAGE_LIMIT);
    let (oids, decorations, total_count) = with_session(cache, &repo, path, &digest, start, limit)?;

    let commits = build_commits(&repo, &oids, &decorations, MessageScope::Subject)?;
    let next_offset = start.saturating_add(commits.len() as u32);
    let next_cursor = (next_offset < total_count).then(|| encode_cursor(&digest, next_offset));

    Ok(HistoryPage {
        commits,
        next_cursor,
        total_count,
    })
}

/// Returns a window of history located around `target_sha` — used for
/// deep-linking (locate + scroll) and the hover graph preview.
pub fn get_commit_history_window(
    cache: &HistoryCache,
    path: &Path,
    target_sha: &str,
    context_before: u32,
    limit: u32,
) -> Result<HistoryWindow, BranchError> {
    let repo = open_repo(path)?;
    let digest = compute_refs_digest(&repo)?;

    // revparse handles short SHAs; a syntactically valid but absent sha
    // resolves to "not found in repo".
    let target_oid = repo
        .revparse_single(target_sha)
        .ok()
        .and_then(|obj| obj.peel_to_commit().ok())
        .map(|c| c.id())
        .ok_or_else(|| BranchError::CommitNotFoundInRepo {
            sha: target_sha.to_string(),
            path: path.display().to_string(),
        })?;

    let limit = limit.clamp(1, MAX_PAGE_LIMIT);

    let mut guard = lock_cache(cache);
    let session = ensure_session(&mut guard, &repo, path, digest.clone())?;

    let target_index =
        *session
            .index
            .get(&target_oid)
            .ok_or_else(|| BranchError::CommitNotFoundInRepo {
                sha: target_sha.to_string(),
                path: path.display().to_string(),
            })?;
    let total_count = session.oids.len() as u32;

    let start_index = target_index.saturating_sub(context_before);
    // The window always spans at least through the target row.
    let span = limit.max(target_index - start_index + 1);
    let end = start_index.saturating_add(span).min(total_count);

    let oids: Vec<Oid> = session.oids[start_index as usize..end as usize].to_vec();
    let decorations = clone_decorations(session, &oids);
    drop(guard);

    let commits = build_commits(&repo, &oids, &decorations, MessageScope::Subject)?;
    let next_cursor = (end < total_count).then(|| encode_cursor(&digest, end));

    Ok(HistoryWindow {
        commits,
        start_index,
        target_index,
        next_cursor,
        total_count,
    })
}

/// Returns the newest commits reachable from a single local branch tip,
/// newest first, plus whether more exist beyond the limit.
///
/// Unlike [`list_commit_history`], this walk is scoped to one branch's
/// ancestry — it is what "the recent commits on this branch" actually means.
/// It deliberately bypasses the session cache: the walk stops after
/// `limit + 1` commits, so it is already O(limit) and would gain nothing from
/// the cached full ordering (which it would have to pay to build).
///
/// Commits carry their full message (subject + body), not just the subject,
/// because the caller renders an expandable description.
pub fn list_branch_commits(
    path: &Path,
    branch: &str,
    limit: u32,
) -> Result<(Vec<HistoryCommit>, bool), BranchError> {
    let repo = open_repo(path)?;

    let tip = repo
        .find_branch(branch, BranchType::Local)
        .map_err(|_| BranchError::BranchNotFound {
            name: branch.to_string(),
            path: path.display().to_string(),
        })?
        .get()
        .peel_to_commit()
        .map_err(|e| BranchError::CommitPeelFailed {
            name: branch.to_string(),
            source: e,
        })?
        .id();

    let limit = limit.clamp(1, MAX_PAGE_LIMIT);

    let mut walk = repo
        .revwalk()
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    walk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    walk.push(tip)
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;

    // One extra commit answers `has_more` without a second walk; it is
    // trimmed before the DTOs are built.
    let mut oids: Vec<Oid> = walk.flatten().take(limit as usize + 1).collect();
    let has_more = oids.len() > limit as usize;
    oids.truncate(limit as usize);

    // Decorations are cheap here (one pass over refs) and let the caller show
    // which other branches/tags point at these commits.
    let decorations = build_decorations(&repo);
    let decorations = oids
        .iter()
        .filter_map(|oid| decorations.get(oid).map(|d| (*oid, d.clone())))
        .collect();

    let commits = build_commits(&repo, &oids, &decorations, MessageScope::Full)?;
    Ok((commits, has_more))
}

/// Computes ahead/behind vs the base for exactly the requested local
/// branches. Branch names that no longer exist locally are skipped silently
/// (they raced with a deletion) — absence in the result is NOT `ahead == 0`.
pub fn list_branch_comparison(
    path: &Path,
    base: Option<&str>,
    branch_names: &[String],
) -> Result<(String, String, Vec<BranchComparison>), BranchError> {
    let repo = open_repo(path)?;

    // Resolve the base: an explicit base must exist; otherwise main → master → HEAD.
    let base_branch = match base {
        Some(name) => Some(repo.find_branch(name, BranchType::Local).map_err(|_| {
            BranchError::BranchNotFound {
                name: name.to_string(),
                path: path.display().to_string(),
            }
        })?),
        None => repo
            .find_branch("main", BranchType::Local)
            .ok()
            .or_else(|| repo.find_branch("master", BranchType::Local).ok()),
    };

    let (base_name, base_oid) = match base_branch {
        Some(branch) => {
            let name = branch.name().ok().flatten().unwrap_or("main").to_string();
            let oid = branch
                .get()
                .peel_to_commit()
                .map_err(|e| BranchError::CommitPeelFailed {
                    name: name.clone(),
                    source: e,
                })?
                .id();
            (name, oid)
        }
        None => {
            let commit = repo
                .head()
                .and_then(|h| h.peel_to_commit())
                .map_err(|e| BranchError::HeadCommitFailed { source: e })?;
            ("HEAD".to_string(), commit.id())
        }
    };

    let mut branches = Vec::with_capacity(branch_names.len());
    for name in branch_names {
        let Ok(branch) = repo.find_branch(name, BranchType::Local) else {
            continue;
        };
        let Ok(commit) = branch.get().peel_to_commit() else {
            continue;
        };
        let oid = commit.id();
        let (ahead, behind) = repo.graph_ahead_behind(oid, base_oid).unwrap_or((0, 0));
        branches.push(BranchComparison {
            name: name.clone(),
            sha: oid.to_string(),
            ahead: ahead as u32,
            behind: behind as u32,
        });
    }

    Ok((base_name, base_oid.to_string(), branches))
}

// ---------------------------------------------------------------------------
// Session cache internals
// ---------------------------------------------------------------------------

fn open_repo(path: &Path) -> Result<Repository, BranchError> {
    Repository::open(path).map_err(|e| BranchError::RepositoryOpenFailed {
        path: path.display().to_string(),
        source: e,
    })
}

fn lock_cache(cache: &HistoryCache) -> std::sync::MutexGuard<'_, HashMap<PathBuf, CachedHistory>> {
    // A poisoned mutex only means another call panicked mid-update; the map
    // holds owned data, so recover it rather than propagating the panic.
    cache
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Digest over the sorted ref tips (+ HEAD target): any ref change yields a
/// new digest, which invalidates both the cache entry and outstanding cursors.
fn compute_refs_digest(repo: &Repository) -> Result<String, BranchError> {
    let mut entries: Vec<(String, String)> = Vec::new();

    let references = repo
        .references()
        .map_err(|e| BranchError::ListFailed { source: e })?;
    for reference in references.flatten() {
        if let (Some(name), Some(oid)) = (reference.name(), reference.target()) {
            entries.push((name.to_string(), oid.to_string()));
        }
    }
    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            entries.push(("HEAD".to_string(), oid.to_string()));
        }
    }

    entries.sort();
    let mut buf = String::with_capacity(entries.len() * 64);
    for (name, oid) in &entries {
        buf.push_str(name);
        buf.push('=');
        buf.push_str(oid);
        buf.push('\n');
    }

    let digest = Oid::hash_object(ObjectType::Blob, buf.as_bytes())
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    Ok(digest.to_string())
}

/// Validates or (re)builds the cached session for `path` under the lock.
fn ensure_session<'a>(
    guard: &'a mut HashMap<PathBuf, CachedHistory>,
    repo: &Repository,
    path: &Path,
    digest: String,
) -> Result<&'a mut CachedHistory, BranchError> {
    let key = path.to_path_buf();

    // (not `is_none_or`: that is stable only since Rust 1.82, above our MSRV)
    let needs_rebuild = guard
        .get(&key)
        .map_or(true, |session| session.digest != digest);

    if needs_rebuild {
        let session = build_session(repo, digest)?;
        if guard.len() >= MAX_CACHED_REPOS && !guard.contains_key(&key) {
            // Evict the least recently used entry.
            if let Some(evict) = guard
                .iter()
                .min_by_key(|(_, s)| s.last_used)
                .map(|(k, _)| k.clone())
            {
                guard.remove(&evict);
            }
        }
        guard.insert(key.clone(), session);
    }

    let session = guard.get_mut(&key).expect("session inserted above");
    session.last_used = Instant::now();
    Ok(session)
}

/// One full revwalk collecting the ordering + index + ref decorations.
fn build_session(repo: &Repository, digest: String) -> Result<CachedHistory, BranchError> {
    let started = Instant::now();

    let mut walk = repo
        .revwalk()
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    // Topological keeps parents after children; time orders siblings sensibly.
    walk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    walk.push_glob("refs/heads/*")
        .map_err(|e| BranchError::RevwalkFailed { source: e })?;
    // HEAD may be detached / not a local branch; best-effort.
    let _ = walk.push_head();

    let mut oids: Vec<Oid> = Vec::new();
    let mut index: HashMap<Oid, u32> = HashMap::new();
    for oid in walk.flatten() {
        index.insert(oid, oids.len() as u32);
        oids.push(oid);
    }

    let decorations = build_decorations(repo);

    log::debug!(
        "history session built: {} commits, {} decorated, in {:?}",
        oids.len(),
        decorations.len(),
        started.elapsed()
    );

    Ok(CachedHistory {
        digest,
        oids,
        index,
        decorations,
        last_used: Instant::now(),
    })
}

/// oid -> [ref decorations], local branches first. Stash/notes/other refs are
/// deliberately not decorations.
fn build_decorations(repo: &Repository) -> HashMap<Oid, Vec<RefDecoration>> {
    let mut decorations: HashMap<Oid, Vec<RefDecoration>> = HashMap::new();

    if let Ok(references) = repo.references() {
        for reference in references.flatten() {
            let Some(oid) = reference.target() else {
                continue;
            };
            let Some(name) = reference.shorthand() else {
                continue;
            };
            let kind = if reference.is_remote() {
                RefKind::RemoteBranch
            } else if reference.is_tag() {
                RefKind::Tag
            } else if reference.is_branch() {
                RefKind::LocalBranch
            } else {
                continue;
            };
            decorations.entry(oid).or_default().push(RefDecoration {
                name: name.to_string(),
                kind,
            });
        }
    }

    let rank = |k: &RefKind| match k {
        RefKind::LocalBranch => 0,
        RefKind::RemoteBranch => 1,
        RefKind::Tag => 2,
    };
    for entries in decorations.values_mut() {
        entries.sort_by(|a, b| rank(&a.kind).cmp(&rank(&b.kind)).then(a.name.cmp(&b.name)));
    }

    decorations
}

/// Locks, validates/rebuilds the session, and clones out the page's slice —
/// keeping the lock hold O(limit).
#[allow(clippy::type_complexity)]
fn with_session(
    cache: &HistoryCache,
    repo: &Repository,
    path: &Path,
    digest: &str,
    start: u32,
    limit: u32,
) -> Result<(Vec<Oid>, HashMap<Oid, Vec<RefDecoration>>, u32), BranchError> {
    let mut guard = lock_cache(cache);
    let session = ensure_session(&mut guard, repo, path, digest.to_string())?;

    let total_count = session.oids.len() as u32;
    let start = start.min(total_count);
    let end = start.saturating_add(limit).min(total_count);
    let oids: Vec<Oid> = session.oids[start as usize..end as usize].to_vec();
    let decorations = clone_decorations(session, &oids);

    Ok((oids, decorations, total_count))
}

fn clone_decorations(session: &CachedHistory, oids: &[Oid]) -> HashMap<Oid, Vec<RefDecoration>> {
    oids.iter()
        .filter_map(|oid| session.decorations.get(oid).map(|d| (*oid, d.clone())))
        .collect()
}

/// How much of a commit message to materialise.
#[derive(Clone, Copy, PartialEq, Eq)]
enum MessageScope {
    /// Subject line only — the graph list renders one line per commit, so the
    /// body would be paid for (200 commits a page) and never shown.
    Subject,
    /// Subject + body, for the callers that disclose a description.
    Full,
}

/// Materialises the DTOs for a slice of oids (outside the cache lock).
fn build_commits(
    repo: &Repository,
    oids: &[Oid],
    decorations: &HashMap<Oid, Vec<RefDecoration>>,
    message_scope: MessageScope,
) -> Result<Vec<HistoryCommit>, BranchError> {
    let mut commits = Vec::with_capacity(oids.len());
    for &oid in oids {
        let commit = repo
            .find_commit(oid)
            .map_err(|e| BranchError::FindCommitFailed {
                sha: oid.to_string(),
                source: e,
            })?;

        let sha = oid.to_string();
        let author = commit.author();

        commits.push(HistoryCommit {
            short_sha: short_sha(&sha),
            parents: commit.parent_ids().map(|p| p.to_string()).collect(),
            refs: decorations.get(&oid).cloned().unwrap_or_default(),
            author: author.name().unwrap_or("").to_string(),
            email: author.email().unwrap_or("").to_string(),
            date: format_commit_time(commit.time()),
            message: match message_scope {
                MessageScope::Subject => commit.summary().unwrap_or("").to_string(),
                // `message()` keeps git's trailing newline; the frontend splits
                // subject from body, so trim it here rather than everywhere.
                MessageScope::Full => commit.message().unwrap_or("").trim_end().to_string(),
            },
            sha,
        });
    }
    Ok(commits)
}

// ---------------------------------------------------------------------------
// Cursor encoding
// ---------------------------------------------------------------------------

fn encode_cursor(digest: &str, next_offset: u32) -> String {
    format!("{digest}:{next_offset}")
}

fn parse_cursor(raw: &str) -> Result<(String, u32), BranchError> {
    let (digest, offset) = raw
        .split_once(':')
        .ok_or(BranchError::InvalidHistoryCursor)?;
    if digest.is_empty() {
        return Err(BranchError::InvalidHistoryCursor);
    }
    let offset: u32 = offset
        .parse()
        .map_err(|_| BranchError::InvalidHistoryCursor)?;
    Ok((digest.to_string(), offset))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::utils::test_utils::{
        commit_file, run_git, setup_history_test_repo, DirectoryGuard,
    };

    /// 7 commits: C1..C3 on main, A1/A2 on feature/a, B1 + merge M. See
    /// `setup_history_test_repo` for the topology diagram.
    const TOTAL: u32 = 7;

    fn full_history(cache: &HistoryCache, path: &Path) -> HistoryPage {
        list_commit_history(cache, path, None, MAX_PAGE_LIMIT).unwrap()
    }

    #[test]
    fn walks_all_commits_topologically() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        let page = full_history(&cache, repo.path());
        assert_eq!(page.total_count, TOTAL);
        assert_eq!(page.commits.len(), TOTAL as usize);
        assert!(page.next_cursor.is_none());

        // Children always appear before their parents.
        let position: HashMap<&str, usize> = page
            .commits
            .iter()
            .enumerate()
            .map(|(i, c)| (c.sha.as_str(), i))
            .collect();
        for (i, commit) in page.commits.iter().enumerate() {
            for parent in &commit.parents {
                assert!(
                    position[parent.as_str()] > i,
                    "parent {} of {} appears before its child",
                    parent,
                    commit.sha
                );
            }
        }

        // Newest is the merge commit (2 parents); oldest is the root (0 parents).
        let first = &page.commits[0];
        assert_eq!(first.message, "Merge feature/b");
        assert_eq!(first.parents.len(), 2);
        let last = page.commits.last().unwrap();
        assert_eq!(last.message, "Initial commit");
        assert!(last.parents.is_empty());

        // DTO basics.
        assert_eq!(first.short_sha, first.sha[..7]);
        assert_eq!(first.author, "Test User");
        assert_eq!(first.email, "test@example.com");
        assert!(!first.date.is_empty());
    }

    #[test]
    fn decorations_cover_kinds_and_sort_local_first() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        let page = full_history(&cache, repo.path());
        let merge = &page.commits[0]; // main tip: branch + remote + tag

        let kinds: Vec<(&str, &RefKind)> = merge
            .refs
            .iter()
            .map(|r| (r.name.as_str(), &r.kind))
            .collect();
        assert_eq!(
            kinds,
            vec![
                ("main", &RefKind::LocalBranch),
                ("origin/main", &RefKind::RemoteBranch),
                ("v1.0", &RefKind::Tag),
            ]
        );

        // feature/a tip carries exactly its local branch.
        let fa_tip = page
            .commits
            .iter()
            .find(|c| c.message == "feature/a: two")
            .unwrap();
        assert_eq!(fa_tip.refs.len(), 1);
        assert_eq!(fa_tip.refs[0].name, "feature/a");
        assert_eq!(fa_tip.refs[0].kind, RefKind::LocalBranch);

        // Undecorated commits have no refs.
        let plain = page
            .commits
            .iter()
            .find(|c| c.message == "main: second")
            .unwrap();
        assert!(plain.refs.is_empty());
    }

    #[test]
    fn paginates_without_overlap_or_gap() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();
        let full = full_history(&cache, repo.path());

        let mut collected: Vec<String> = Vec::new();
        let mut cursor: Option<String> = None;
        let mut pages = 0;
        loop {
            let page = list_commit_history(&cache, repo.path(), cursor.as_deref(), 3).unwrap();
            assert_eq!(page.total_count, TOTAL, "total_count stable across pages");
            collected.extend(page.commits.iter().map(|c| c.sha.clone()));
            pages += 1;
            match page.next_cursor {
                Some(next) => cursor = Some(next),
                None => break,
            }
        }

        assert_eq!(pages, 3); // 3 + 3 + 1
        let expected: Vec<String> = full.commits.iter().map(|c| c.sha.clone()).collect();
        assert_eq!(collected, expected, "pages concatenate to the full walk");
    }

    #[test]
    fn clamps_limit() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        // limit 0 is clamped up to 1.
        let page = list_commit_history(&cache, repo.path(), None, 0).unwrap();
        assert_eq!(page.commits.len(), 1);
        assert!(page.next_cursor.is_some());

        // A limit larger than the history returns everything, no cursor.
        let page = list_commit_history(&cache, repo.path(), None, 10_000).unwrap();
        assert_eq!(page.commits.len(), TOTAL as usize);
        assert!(page.next_cursor.is_none());
    }

    #[test]
    fn stale_cursor_is_rejected_after_ref_change() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        let page = list_commit_history(&cache, repo.path(), None, 3).unwrap();
        let cursor = page.next_cursor.unwrap();

        commit_file(
            repo.path(),
            "new.txt",
            "x",
            "main: newer",
            "2024-02-01T10:00:00Z",
        );

        let err = list_commit_history(&cache, repo.path(), Some(&cursor), 3).unwrap_err();
        assert!(matches!(err, BranchError::HistoryCursorStale { .. }));
        let app: crate::shared::error::AppError = err.into();
        assert_eq!(app.kind, "history_cursor_stale");
    }

    #[test]
    fn malformed_cursors_are_rejected() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        for cursor in ["garbage", "abc:", "abc:notanumber", ":42"] {
            let err = list_commit_history(&cache, repo.path(), Some(cursor), 3).unwrap_err();
            assert!(
                matches!(err, BranchError::InvalidHistoryCursor),
                "cursor {cursor:?} should be invalid"
            );
        }
    }

    #[test]
    fn rebuilds_session_when_refs_change_without_cursor() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        assert_eq!(full_history(&cache, repo.path()).total_count, TOTAL);

        let new_sha = commit_file(
            repo.path(),
            "new.txt",
            "x",
            "main: newer",
            "2024-02-01T10:00:00Z",
        );

        let page = full_history(&cache, repo.path());
        assert_eq!(page.total_count, TOTAL + 1);
        assert_eq!(page.commits[0].sha, new_sha);
    }

    #[test]
    fn window_locates_target_mid_history() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();
        let full = full_history(&cache, repo.path());

        let target = full
            .commits
            .iter()
            .find(|c| c.message == "main: third")
            .unwrap();
        let expected_index = full
            .commits
            .iter()
            .position(|c| c.sha == target.sha)
            .unwrap() as u32;

        let window = get_commit_history_window(&cache, repo.path(), &target.sha, 2, 5).unwrap();
        assert_eq!(window.target_index, expected_index);
        assert_eq!(window.start_index, expected_index.saturating_sub(2));
        assert_eq!(window.total_count, TOTAL);
        let offset = (window.target_index - window.start_index) as usize;
        assert_eq!(window.commits[offset].sha, target.sha);
        // The window mirrors the full walk slice.
        for (i, commit) in window.commits.iter().enumerate() {
            assert_eq!(
                commit.sha,
                full.commits[window.start_index as usize + i].sha
            );
        }
    }

    #[test]
    fn window_handles_tip_root_and_short_sha() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();
        let full = full_history(&cache, repo.path());

        // Tip with context before it clamps to the start.
        let tip = &full.commits[0];
        let window = get_commit_history_window(&cache, repo.path(), &tip.sha, 3, 4).unwrap();
        assert_eq!(window.target_index, 0);
        assert_eq!(window.start_index, 0);
        assert!(window.next_cursor.is_some());

        // Root: the window always spans through the target even when the
        // remaining history is shorter than the limit.
        let root = full.commits.last().unwrap();
        let window = get_commit_history_window(&cache, repo.path(), &root.sha, 2, 5).unwrap();
        assert_eq!(window.target_index, TOTAL - 1);
        assert_eq!(window.commits.last().unwrap().sha, root.sha);
        assert!(window.next_cursor.is_none());

        // Short SHA resolves to the same target.
        let short = &tip.sha[..7];
        let window = get_commit_history_window(&cache, repo.path(), short, 0, 1).unwrap();
        assert_eq!(window.target_index, 0);
        assert_eq!(window.commits[0].sha, tip.sha);
    }

    #[test]
    fn window_rejects_unknown_target() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();
        let cache = HistoryCache::default();

        let err = get_commit_history_window(
            &cache,
            repo.path(),
            "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            0,
            5,
        )
        .unwrap_err();
        assert!(matches!(err, BranchError::CommitNotFoundInRepo { .. }));
        let app: crate::shared::error::AppError = err.into();
        assert_eq!(app.kind, "commit_not_found");
    }

    #[test]
    fn empty_repository_yields_empty_page() {
        let _guard = DirectoryGuard::new();
        let dir = tempfile::tempdir().unwrap();
        run_git(dir.path(), &["init", "--initial-branch=main"]);
        let cache = HistoryCache::default();

        let page = list_commit_history(&cache, dir.path(), None, 50).unwrap();
        assert!(page.commits.is_empty());
        assert!(page.next_cursor.is_none());
        assert_eq!(page.total_count, 0);
    }

    #[test]
    fn open_fails_for_non_repository() {
        let _guard = DirectoryGuard::new();
        let dir = tempfile::tempdir().unwrap();
        let cache = HistoryCache::default();

        let err = list_commit_history(&cache, dir.path(), None, 50).unwrap_err();
        assert!(matches!(err, BranchError::RepositoryOpenFailed { .. }));
    }

    #[test]
    fn comparison_computes_only_requested_branches() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let (base_name, base_sha, branches) = list_branch_comparison(
            repo.path(),
            None,
            &["feature/a".to_string(), "feature/b".to_string()],
        )
        .unwrap();
        assert_eq!(base_name, "main");
        assert!(!base_sha.is_empty());
        assert_eq!(branches.len(), 2);

        // feature/a: A1+A2 unique; main has C3, B1, M it lacks.
        let fa = branches.iter().find(|b| b.name == "feature/a").unwrap();
        assert_eq!((fa.ahead, fa.behind), (2, 3));

        // feature/b is merged: nothing unique, only the merge commit behind.
        let fb = branches.iter().find(|b| b.name == "feature/b").unwrap();
        assert_eq!((fb.ahead, fb.behind), (0, 1));
    }

    #[test]
    fn comparison_skips_unknown_names_silently() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let (_, _, branches) = list_branch_comparison(
            repo.path(),
            None,
            &["feature/a".to_string(), "does-not-exist".to_string()],
        )
        .unwrap();
        assert_eq!(branches.len(), 1);
        assert_eq!(branches[0].name, "feature/a");
    }

    #[test]
    fn comparison_requires_explicit_base_to_exist() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let err = list_branch_comparison(
            repo.path(),
            Some("no-such-base"),
            &["feature/a".to_string()],
        )
        .unwrap_err();
        assert!(matches!(err, BranchError::BranchNotFound { .. }));
    }

    #[test]
    fn comparison_explicit_base_is_used() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let (base_name, _, branches) =
            list_branch_comparison(repo.path(), Some("feature/a"), &["main".to_string()]).unwrap();
        assert_eq!(base_name, "feature/a");
        // Inverse perspective of the main-base numbers.
        assert_eq!((branches[0].ahead, branches[0].behind), (3, 2));
    }

    #[test]
    fn comparison_base_falls_back_to_master_then_head() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        // main → master: auto-resolution picks master.
        run_git(repo.path(), &["branch", "-m", "main", "master"]);
        let (base_name, _, _) =
            list_branch_comparison(repo.path(), None, &["feature/a".to_string()]).unwrap();
        assert_eq!(base_name, "master");

        // Neither main nor master: falls back to HEAD.
        run_git(repo.path(), &["branch", "-m", "master", "trunk"]);
        let (base_name, _, branches) =
            list_branch_comparison(repo.path(), None, &["trunk".to_string()]).unwrap();
        assert_eq!(base_name, "HEAD");
        // trunk IS head, so it is neither ahead nor behind.
        assert_eq!((branches[0].ahead, branches[0].behind), (0, 0));
    }

    #[test]
    fn branch_commits_are_scoped_to_one_branch() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let (commits, has_more) = list_branch_commits(repo.path(), "feature/a", 50).unwrap();

        // feature/a branched off main after "main: second", so it sees neither
        // "main: third" nor the merge — the whole point of walking one tip.
        let messages: Vec<&str> = commits.iter().map(|c| c.message.as_str()).collect();
        assert_eq!(
            messages,
            vec![
                "feature/a: two",
                "feature/a: one",
                "main: second",
                "Initial commit",
            ]
        );
        assert!(!has_more);

        // DTO basics carry over from the shared builder.
        let tip = &commits[0];
        assert_eq!(tip.short_sha, tip.sha[..7]);
        assert_eq!(tip.author, "Test User");
        assert!(!tip.date.is_empty());
        assert_eq!(tip.refs.len(), 1);
        assert_eq!(tip.refs[0].name, "feature/a");
        assert_eq!(tip.refs[0].kind, RefKind::LocalBranch);
    }

    #[test]
    fn branch_commits_report_more_and_clamp_the_limit() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        // feature/a has 4 commits: a limit below that leaves more behind.
        let (commits, has_more) = list_branch_commits(repo.path(), "feature/a", 2).unwrap();
        assert_eq!(commits.len(), 2);
        assert!(has_more);

        // Exactly the branch length: nothing is left over.
        let (commits, has_more) = list_branch_commits(repo.path(), "feature/a", 4).unwrap();
        assert_eq!(commits.len(), 4);
        assert!(!has_more);

        // 0 clamps up to 1 rather than returning an empty list.
        let (commits, has_more) = list_branch_commits(repo.path(), "feature/a", 0).unwrap();
        assert_eq!(commits.len(), 1);
        assert!(has_more);
    }

    #[test]
    fn branch_commits_carry_the_full_message_body() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        run_git(repo.path(), &["checkout", "feature/a"]);
        commit_file(
            repo.path(),
            "body.txt",
            "1",
            "subject line\n\nbody paragraph",
            "2024-01-08T10:00:00Z",
        );

        let (commits, _) = list_branch_commits(repo.path(), "feature/a", 1).unwrap();
        // Full scope keeps the body but drops git's trailing newline.
        assert_eq!(commits[0].message, "subject line\n\nbody paragraph");

        // The paged history walk stays subject-only for the same commit.
        let cache = HistoryCache::default();
        let page = full_history(&cache, repo.path());
        let same = page
            .commits
            .iter()
            .find(|c| c.sha == commits[0].sha)
            .unwrap();
        assert_eq!(same.message, "subject line");
    }

    #[test]
    fn branch_commits_reject_unknown_branch_and_non_repository() {
        let _guard = DirectoryGuard::new();
        let repo = setup_history_test_repo();

        let err = list_branch_commits(repo.path(), "does/not/exist", 10).unwrap_err();
        assert!(matches!(err, BranchError::BranchNotFound { .. }));

        let dir = tempfile::tempdir().unwrap();
        let err = list_branch_commits(dir.path(), "main", 10).unwrap_err();
        assert!(matches!(err, BranchError::RepositoryOpenFailed { .. }));
    }

    /// Manual perf check against a large real repository. Run with:
    /// `CUT_BRANCHES_PERF_REPO=~/big-repo cargo test perf_paging -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn perf_paging_on_real_repo() {
        let Ok(repo_path) = std::env::var("CUT_BRANCHES_PERF_REPO") else {
            eprintln!("CUT_BRANCHES_PERF_REPO not set; skipping");
            return;
        };
        let path = Path::new(&repo_path);
        let cache = HistoryCache::default();

        let started = Instant::now();
        let first = list_commit_history(&cache, path, None, 200).unwrap();
        eprintln!(
            "page 1 (session build): {:?} — {} commits total",
            started.elapsed(),
            first.total_count
        );

        let mut cursor = first.next_cursor;
        let mut page_no = 1;
        let started = Instant::now();
        while let Some(c) = cursor {
            let page = list_commit_history(&cache, path, Some(&c), 200).unwrap();
            cursor = page.next_cursor;
            page_no += 1;
            if page_no >= 50 {
                break;
            }
        }
        eprintln!("pages 2..{page_no}: {:?}", started.elapsed());
    }
}

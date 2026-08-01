//! Ignored timing harness for the branch-loading hot paths. Not a unit test —
//! run explicitly to compare before/after optimization numbers:
//!
//! ```sh
//! cargo test --release --lib perf_bench -- --ignored --nocapture
//! ```

#![allow(dead_code)]
use std::path::Path;
use std::process::Command;
use std::time::Instant;

const BRANCH_COUNT: usize = 150;

fn git(path: &Path, args: &[&str]) {
    let out = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .expect("git failed to run");
    assert!(
        out.status.success(),
        "git {:?} failed: {}",
        args,
        String::from_utf8_lossy(&out.stderr)
    );
}

/// A repo with BRANCH_COUNT branches, each carrying one unique commit off main.
fn setup_bench_repo() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path();
    git(path, &["init", "-b", "main"]);
    git(path, &["config", "user.email", "bench@example.com"]);
    git(path, &["config", "user.name", "Bench"]);
    std::fs::write(path.join("base.txt"), "base\n").unwrap();
    git(path, &["add", "."]);
    git(path, &["commit", "-m", "base commit"]);

    for i in 0..BRANCH_COUNT {
        let name = format!("feature/branch-{i:03}");
        git(path, &["checkout", "-b", &name]);
        std::fs::write(path.join(format!("file-{i}.txt")), format!("content {i}\n")).unwrap();
        git(path, &["add", "."]);
        git(path, &["commit", "-m", &format!("commit for branch {i}")]);
        git(path, &["checkout", "main"]);
    }
    dir
}

#[test]
#[ignore]
fn bench_branch_loading_hot_paths() {
    let repo = setup_bench_repo();
    let path = repo.path();
    let names: Vec<String> = (0..BRANCH_COUNT)
        .map(|i| format!("feature/branch-{i:03}"))
        .collect();

    // 1. Per-card path as shipped today: one repo open per command, two
    //    commands per branch (merge status + diff stats).
    let t = Instant::now();
    for name in &names {
        let _ =
            crate::domains::branch_management::infrastructure::git::branch::check_branch_merge_status(
                path, name,
            )
            .unwrap();
        let _ =
            crate::domains::branch_management::infrastructure::git::branch::get_branch_diff_stats(
                path, name,
            )
            .unwrap();
    }
    let per_card = t.elapsed();

    // 1b. Same work through the bulk path: one repo open for the whole batch.
    let t = Instant::now();
    let metrics =
        crate::domains::branch_management::infrastructure::git::branch::bulk_get_branch_metrics(
            path, &names,
        )
        .unwrap();
    let bulk = t.elapsed();
    assert_eq!(metrics.len(), BRANCH_COUNT);

    // 2. Full branch listing (the list_branches_fast path inside get_repository).
    let t = Instant::now();
    let branches =
        crate::domains::branch_management::infrastructure::git::branch::get_all_branches_with_last_commit_fast(
            path,
        )
        .unwrap();
    let listing = t.elapsed();
    assert_eq!(branches.len(), BRANCH_COUNT + 1);

    // 3. Ref-state fingerprint walk (runs on every get_repository call).
    let t = Instant::now();
    let _ = crate::domains::repository_management::infrastructure::state_hash::compute_repo_state_timestamp(path)
        .unwrap();
    let fingerprint = t.elapsed();

    println!("== perf_bench ({BRANCH_COUNT} branches) ==");
    println!("per-card merge+diff, individual calls: {per_card:?}");
    println!("bulk merge+diff, one repo open:        {bulk:?}");
    println!("list_branches_fast:                    {listing:?}");
    println!("state fingerprint walk:                {fingerprint:?}");
}

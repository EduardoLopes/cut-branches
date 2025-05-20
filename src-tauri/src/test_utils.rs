use std::fs;
use std::process::Command;
use tempfile::tempdir;

/// Sets up a test git repository in a temporary directory.
///
/// # Returns
///
/// * `tempfile::TempDir` - A temporary directory containing an initialized git repository
///
/// The repository will have:
/// - A single file named test.txt with "test content"
/// - An initial commit with the message "Initial commit"
/// - Git user configured as "Test User" with email "test@example.com"
pub fn setup_test_repo() -> tempfile::TempDir {
    // Create a temp directory
    let dir = tempdir().unwrap();
    let path = dir.path();

    println!("Setting up test repo at: {}", path.display());

    // Initialize git repo with initial branch name "main"
    assert!(
        Command::new("git")
            .args(["init", "--initial-branch=main"])
            .current_dir(path)
            .status()
            .unwrap_or_else(|_| {
                // For older git versions that don't support --initial-branch
                let status = Command::new("git")
                    .args(["init"])
                    .current_dir(path)
                    .status()
                    .unwrap();

                // Configure initial branch as "main" for older git versions
                if status.success() {
                    Command::new("git")
                        .args(["config", "--local", "init.defaultBranch", "main"])
                        .current_dir(path)
                        .status()
                        .unwrap();
                }

                status
            })
            .success(),
        "Failed to initialize git repo at {}",
        path.display()
    );

    // Configure test user
    assert!(
        Command::new("git")
            .args(["config", "--local", "user.name", "Test User"])
            .current_dir(path)
            .status()
            .unwrap()
            .success(),
        "Failed to configure git user.name"
    );

    assert!(
        Command::new("git")
            .args(["config", "--local", "user.email", "test@example.com"])
            .current_dir(path)
            .status()
            .unwrap()
            .success(),
        "Failed to configure git user.email"
    );

    // Create a test file and commit it
    fs::write(path.join("test.txt"), "test content").unwrap();

    assert!(
        Command::new("git")
            .args(["add", "test.txt"])
            .current_dir(path)
            .status()
            .unwrap()
            .success(),
        "Failed to git add test.txt"
    );

    assert!(
        Command::new("git")
            .args(["commit", "-m", "Initial commit"])
            .env("GIT_AUTHOR_NAME", "Test User")
            .env("GIT_AUTHOR_EMAIL", "test@example.com")
            .env("GIT_COMMITTER_NAME", "Test User")
            .env("GIT_COMMITTER_EMAIL", "test@example.com")
            .current_dir(path)
            .status()
            .unwrap()
            .success(),
        "Failed to commit initial changes"
    );

    // Verify we're in a git repository and on the main branch
    let git_check = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(path)
        .output()
        .unwrap();
    assert!(
        git_check.status.success(),
        "Failed to set up git repository at {}",
        path.display()
    );

    // Print current branch for debugging
    let branch_check = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .unwrap();
    let current_branch = String::from_utf8_lossy(&branch_check.stdout)
        .trim()
        .to_string();
    println!("Created repo with current branch: {}", current_branch);

    // Return the temp directory
    dir
}

/// Saves the current working directory and returns a struct to manage it.
///
/// This is useful in tests to ensure that changing directories in one test
/// doesn't affect other tests.
///
/// # Returns
///
/// * `DirectoryGuard` - A guard that restores the original directory when dropped
pub struct DirectoryGuard {
    original_dir: std::path::PathBuf,
}

impl DirectoryGuard {
    pub fn new() -> Self {
        let original_dir = std::env::current_dir().unwrap();
        Self { original_dir }
    }
}

impl Drop for DirectoryGuard {
    fn drop(&mut self) {
        let _ = std::env::set_current_dir(&self.original_dir);
    }
}

use std::process::Command;
#[cfg(test)]
use tempfile::tempdir;
#[cfg(test)]
use std::fs;
#[cfg(all(test, unix))]
use std::os::unix::process::ExitStatusExt;

/// Trait for git operations to allow mocking in tests
pub trait GitCommand {
    fn init(&self, path: &std::path::Path) -> std::io::Result<std::process::ExitStatus>;
    fn config(
        &self,
        path: &std::path::Path,
        key: &str,
        value: &str,
    ) -> std::io::Result<std::process::ExitStatus>;
    fn add(&self, path: &std::path::Path, file: &str) -> std::io::Result<std::process::ExitStatus>;
    fn commit(
        &self,
        path: &std::path::Path,
        message: &str,
    ) -> std::io::Result<std::process::ExitStatus>;
    fn rev_parse(
        &self,
        path: &std::path::Path,
        args: &[&str],
    ) -> std::io::Result<std::process::Output>;
    fn branch(
        &self,
        path: &std::path::Path,
        args: &[&str],
    ) -> std::io::Result<std::process::Output>;
}

/// Real implementation of GitCommand that uses the actual git command
pub struct RealGitCommand;

impl GitCommand for RealGitCommand {
    fn init(&self, path: &std::path::Path) -> std::io::Result<std::process::ExitStatus> {
        Command::new("git")
            .args(["init", "--initial-branch=main"])
            .current_dir(path)
            .status()
    }

    fn config(
        &self,
        path: &std::path::Path,
        key: &str,
        value: &str,
    ) -> std::io::Result<std::process::ExitStatus> {
        Command::new("git")
            .args(["config", "--local", key, value])
            .current_dir(path)
            .status()
    }

    fn add(&self, path: &std::path::Path, file: &str) -> std::io::Result<std::process::ExitStatus> {
        Command::new("git")
            .args(["add", file])
            .current_dir(path)
            .status()
    }

    fn commit(
        &self,
        path: &std::path::Path,
        message: &str,
    ) -> std::io::Result<std::process::ExitStatus> {
        Command::new("git")
            .args(["commit", "-m", message])
            .env("GIT_AUTHOR_NAME", "Test User")
            .env("GIT_AUTHOR_EMAIL", "test@example.com")
            .env("GIT_COMMITTER_NAME", "Test User")
            .env("GIT_COMMITTER_EMAIL", "test@example.com")
            .current_dir(path)
            .status()
    }

    fn rev_parse(
        &self,
        path: &std::path::Path,
        args: &[&str],
    ) -> std::io::Result<std::process::Output> {
        let mut cmd = Command::new("git");
        cmd.arg("rev-parse").args(args).current_dir(path);
        cmd.output()
    }

    fn branch(
        &self,
        path: &std::path::Path,
        args: &[&str],
    ) -> std::io::Result<std::process::Output> {
        let mut cmd = Command::new("git");
        cmd.arg("branch").args(args).current_dir(path);
        cmd.output()
    }
}

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
#[cfg(test)]
pub fn setup_test_repo() -> tempfile::TempDir {
    setup_test_repo_with_git_command(&RealGitCommand)
}

/// Internal function that takes a GitCommand implementation for testing
#[cfg(test)]
fn setup_test_repo_with_git_command(git: &dyn GitCommand) -> tempfile::TempDir {
    // Create a temp directory
    let dir = tempdir().unwrap();
    let path = dir.path();

    println!("Setting up test repo at: {}", path.display());

    // Initialize git repo with initial branch name "main"
    assert!(
        git.init(path).unwrap().success(),
        "Failed to initialize git repo at {}",
        path.display()
    );

    // Configure test user
    assert!(
        git.config(path, "user.name", "Test User")
            .unwrap()
            .success(),
        "Failed to configure git user.name"
    );

    assert!(
        git.config(path, "user.email", "test@example.com")
            .unwrap()
            .success(),
        "Failed to configure git user.email"
    );

    // Create a test file and commit it
    fs::write(path.join("test.txt"), "test content").unwrap();

    assert!(
        git.add(path, "test.txt").unwrap().success(),
        "Failed to git add test.txt"
    );

    assert!(
        git.commit(path, "Initial commit").unwrap().success(),
        "Failed to commit initial changes"
    );

    // Verify we're in a git repository and on the main branch
    let git_check = git.rev_parse(path, &["--is-inside-work-tree"]).unwrap();
    assert!(
        git_check.status.success(),
        "Failed to set up git repository at {}",
        path.display()
    );

    // Print current branch for debugging
    let branch_check = git.branch(path, &["--show-current"]).unwrap();
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

impl Default for DirectoryGuard {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;

    /// Mock implementation of GitCommand that fails all operations
    struct FailingGitCommand;

    impl GitCommand for FailingGitCommand {
        fn init(&self, _path: &std::path::Path) -> std::io::Result<std::process::ExitStatus> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }

        fn config(
            &self,
            _path: &std::path::Path,
            _key: &str,
            _value: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }

        fn add(
            &self,
            _path: &std::path::Path,
            _file: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }

        fn commit(
            &self,
            _path: &std::path::Path,
            _message: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }

        fn rev_parse(
            &self,
            _path: &std::path::Path,
            _args: &[&str],
        ) -> std::io::Result<std::process::Output> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }

        fn branch(
            &self,
            _path: &std::path::Path,
            _args: &[&str],
        ) -> std::io::Result<std::process::Output> {
            Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "Mocked failure",
            ))
        }
    }

    /// Mock implementation of GitCommand that returns invalid UTF-8 output
    struct InvalidUtf8GitCommand;

    impl GitCommand for InvalidUtf8GitCommand {
        fn init(&self, _path: &std::path::Path) -> std::io::Result<std::process::ExitStatus> {
            #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
        }

        fn config(
            &self,
            _path: &std::path::Path,
            _key: &str,
            _value: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
        }

        fn add(
            &self,
            _path: &std::path::Path,
            _file: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
        }

        fn commit(
            &self,
            _path: &std::path::Path,
            _message: &str,
        ) -> std::io::Result<std::process::ExitStatus> {
            #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
        }

        fn rev_parse(
            &self,
            _path: &std::path::Path,
            _args: &[&str],
        ) -> std::io::Result<std::process::Output> {
            Ok(std::process::Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: b"\xFF\xFF\xFF\xFF".to_vec(),
                stderr: b"\xFF\xFF\xFF\xFF".to_vec(),
            })
        }

        fn branch(
            &self,
            _path: &std::path::Path,
            _args: &[&str],
        ) -> std::io::Result<std::process::Output> {
            Ok(std::process::Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: b"\xFF\xFF\xFF\xFF".to_vec(),
                stderr: b"\xFF\xFF\xFF\xFF".to_vec(),
            })
        }
    }

    #[test]
    fn test_setup_test_repo_with_git_init_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.init(_path);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_config_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.config(_path, "user.name", "Test User");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_add_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.add(_path, "test.txt");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_commit_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.commit(_path, "Initial commit");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_check_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.rev_parse(_path, &["--is-inside-work-tree"]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_branch_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.branch(_path, &["--show-current"]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_output() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.rev_parse(_path, &["--is-inside-work-tree"]);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.status.success());

        // Test that we can handle invalid UTF-8 in stdout
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains(""));

        // Test that we can handle invalid UTF-8 in stderr
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(stderr.contains(""));
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_branch_output() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.branch(_path, &["--show-current"]);
        assert!(result.is_ok());
        let output = result.unwrap();
        assert!(output.status.success());

        // Test that we can handle invalid UTF-8 in stdout
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains(""));

        // Test that we can handle invalid UTF-8 in stderr
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(stderr.contains(""));
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_init() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.init(_path);
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(status.success());
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_config() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.config(_path, "user.name", "Test User");
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(status.success());
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_add() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.add(_path, "test.txt");
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(status.success());
    }

    #[test]
    fn test_setup_test_repo_with_invalid_utf8_commit() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        let result = git.commit(_path, "Initial commit");
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(status.success());
    }

    #[test]
    fn test_setup_test_repo_with_git_init_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.init(_path);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_config_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.config(_path, "user.name", "Test User");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_add_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.add(_path, "test.txt");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_commit_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.commit(_path, "Initial commit");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_check_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.rev_parse(_path, &["--is-inside-work-tree"]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_branch_failure_and_error_message() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        let result = git.branch(_path, &["--show-current"]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::PermissionDenied);
        assert_eq!(err.to_string(), "Mocked failure");
    }

    #[test]
    fn test_setup_test_repo_with_git_command_failure_chain() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = FailingGitCommand;

        // Test that each git command failure is properly propagated
        let result = std::panic::catch_unwind(|| {
            setup_test_repo_with_git_command(&git);
        });
        assert!(
            result.is_err(),
            "Expected setup to fail with FailingGitCommand"
        );
    }

    #[test]
    fn test_setup_test_repo_with_invalid_git_output() {
        let dir = tempdir().unwrap();
        let _path = dir.path();
        let git = InvalidUtf8GitCommand;

        // Test that invalid git output is handled gracefully
        let _result = setup_test_repo_with_git_command(&git);

        // Verify that the repository was created and the branch name contains invalid UTF-8
        let branch_check = git.branch(_path, &["--show-current"]).unwrap();
        let current_branch = String::from_utf8_lossy(&branch_check.stdout);
        assert!(
            current_branch.contains(""),
            "Expected branch name to contain invalid UTF-8 characters"
        );
    }

    #[test]
    fn test_setup_test_repo_with_git_command_partial_failure() {
        let dir = tempdir().unwrap();
        let _path = dir.path();

        // Create a mock that fails only after successful init
        struct PartialFailingGitCommand {
            init_succeeded: bool,
        }

        impl GitCommand for PartialFailingGitCommand {
            fn init(&self, _path: &std::path::Path) -> std::io::Result<std::process::ExitStatus> {
                #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
            }

            fn config(
                &self,
                _path: &std::path::Path,
                _key: &str,
                _value: &str,
            ) -> std::io::Result<std::process::ExitStatus> {
                if self.init_succeeded {
                    Err(io::Error::new(
                        io::ErrorKind::PermissionDenied,
                        "Config failed",
                    ))
                } else {
                    #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
                }
            }

            fn add(
                &self,
                _path: &std::path::Path,
                _file: &str,
            ) -> std::io::Result<std::process::ExitStatus> {
                #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
            }

            fn commit(
                &self,
                _path: &std::path::Path,
                _message: &str,
            ) -> std::io::Result<std::process::ExitStatus> {
                #[cfg(unix)]
            {
                Ok(std::process::ExitStatus::from_raw(0))
            }
            #[cfg(not(unix))]
            {
                use std::process::{Command, Stdio};
                Ok(Command::new("true")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status()
                    .unwrap())
            }
            }

            fn rev_parse(
                &self,
                _path: &std::path::Path,
                _args: &[&str],
            ) -> std::io::Result<std::process::Output> {
                Ok(std::process::Output {
                    #[cfg(unix)]
                    status: std::process::ExitStatus::from_raw(0),
                    #[cfg(not(unix))]
                    status: {
                        use std::process::{Command, Stdio};
                        Command::new("true")
                            .stdout(Stdio::null())
                            .stderr(Stdio::null())
                            .status()
                            .unwrap()
                    },
                    stdout: b"true".to_vec(),
                    stderr: Vec::new(),
                })
            }

            fn branch(
                &self,
                _path: &std::path::Path,
                _args: &[&str],
            ) -> std::io::Result<std::process::Output> {
                Ok(std::process::Output {
                    #[cfg(unix)]
                    status: std::process::ExitStatus::from_raw(0),
                    #[cfg(not(unix))]
                    status: {
                        use std::process::{Command, Stdio};
                        Command::new("true")
                            .stdout(Stdio::null())
                            .stderr(Stdio::null())
                            .status()
                            .unwrap()
                    },
                    stdout: b"main".to_vec(),
                    stderr: Vec::new(),
                })
            }
        }

        let git = PartialFailingGitCommand {
            init_succeeded: true,
        };
        let result = std::panic::catch_unwind(|| {
            setup_test_repo_with_git_command(&git);
        });
        assert!(
            result.is_err(),
            "Expected setup to fail with PartialFailingGitCommand"
        );
    }
}

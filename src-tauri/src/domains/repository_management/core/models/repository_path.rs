//! TODO(step-10-migration): wire RepositoryPath at command/discovery boundaries.
//! Most commands accept a raw `String` for the repo path; converting to
//! `RepositoryPath` once at the boundary lets every downstream call rely on
//! "already validated" semantics instead of repeating `Path::new(&s).exists()`
//! checks.
//!
//! Mirrors the FE Value Object at src/core/repository-path.ts.

#![allow(dead_code)]

use std::fmt;
use std::path::{Path, PathBuf};

use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RepositoryPathError {
    #[error("Repository path must be non-empty")]
    Empty,

    #[error("Repository path '{0}' contains a NUL byte")]
    ContainsNul(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RepositoryPath(PathBuf);

impl RepositoryPath {
    /// Constructs a `RepositoryPath`. Whitespace is trimmed and trailing path
    /// separators are dropped (root paths are preserved). Existence and
    /// `.git/` presence are intentionally *not* checked here — that's an I/O
    /// concern handled by `path_operations::is_git_repository`. The Value
    /// Object guarantees only that the input is a syntactically usable path.
    pub fn new(raw: impl Into<String>) -> Result<Self, RepositoryPathError> {
        let trimmed = raw.into().trim().to_string();

        if trimmed.is_empty() {
            return Err(RepositoryPathError::Empty);
        }

        if trimmed.contains('\0') {
            return Err(RepositoryPathError::ContainsNul(trimmed));
        }

        let normalised = strip_trailing_separators(&trimmed);
        Ok(Self(PathBuf::from(normalised)))
    }

    pub fn as_path(&self) -> &Path {
        self.0.as_path()
    }

    pub fn as_str(&self) -> &str {
        self.0.to_str().unwrap_or_default()
    }

    pub fn into_inner(self) -> PathBuf {
        self.0
    }

    /// `true` for `/foo/bar`, `C:\foo`, etc. `false` for relative paths.
    pub fn is_absolute(&self) -> bool {
        self.0.is_absolute()
    }
}

impl fmt::Display for RepositoryPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0.display().to_string())
    }
}

impl AsRef<Path> for RepositoryPath {
    fn as_ref(&self) -> &Path {
        self.0.as_path()
    }
}

fn strip_trailing_separators(s: &str) -> String {
    let mut end = s.len();
    let bytes = s.as_bytes();
    while end > 1 && (bytes[end - 1] == b'/' || bytes[end - 1] == b'\\') {
        end -= 1;
    }
    s[..end].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_unix_path() {
        let p = RepositoryPath::new("/path/to/repo").unwrap();
        assert_eq!(p.as_str(), "/path/to/repo");
        assert!(p.is_absolute());
    }

    #[test]
    fn accepts_relative_path() {
        let p = RepositoryPath::new("./repo").unwrap();
        assert!(!p.is_absolute());
    }

    #[test]
    fn trims_whitespace() {
        assert_eq!(
            RepositoryPath::new("  /path/to/repo  ").unwrap().as_str(),
            "/path/to/repo"
        );
    }

    #[test]
    fn strips_trailing_slash() {
        assert_eq!(
            RepositoryPath::new("/path/to/repo/").unwrap().as_str(),
            "/path/to/repo"
        );
    }

    #[test]
    fn preserves_root() {
        // Single "/" must survive normalisation.
        assert_eq!(RepositoryPath::new("/").unwrap().as_str(), "/");
    }

    #[test]
    fn rejects_empty() {
        assert_eq!(RepositoryPath::new(""), Err(RepositoryPathError::Empty));
        assert_eq!(RepositoryPath::new("   "), Err(RepositoryPathError::Empty));
    }

    #[test]
    fn rejects_nul_byte() {
        assert!(matches!(
            RepositoryPath::new("/path/with\0nul"),
            Err(RepositoryPathError::ContainsNul(_))
        ));
    }

    /// Pins the FE/BE contract — see branch_name.rs for the pattern.
    #[test]
    fn repository_path_contract() {
        const CASES: &str =
            include_str!("../../../../../../tests/contracts/repository-path.cases.json");

        #[derive(serde::Deserialize)]
        struct InvalidCase {
            input: String,
            reason: String,
        }

        #[derive(serde::Deserialize)]
        struct Cases {
            valid: Vec<String>,
            invalid: Vec<InvalidCase>,
        }

        let cases: Cases = serde_json::from_str(CASES).expect("contract JSON parses");

        for input in &cases.valid {
            assert!(
                RepositoryPath::new(input.clone()).is_ok(),
                "expected valid case {:?} to be accepted",
                input
            );
        }

        for case in &cases.invalid {
            assert!(
                RepositoryPath::new(case.input.clone()).is_err(),
                "expected invalid case {:?} ({}) to be rejected",
                case.input,
                case.reason
            );
        }
    }
}

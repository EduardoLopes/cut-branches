//! TODO(step-10-migration): wire CommitSha at git/branch boundaries.
//! Today commit SHAs cross domain boundaries as raw `String`. Replace with
//! `CommitSha` so hex/length validation happens once.
//!
//! Mirrors the FE Value Object at src/core/commit-sha.ts.

#![allow(dead_code)]

use std::fmt;

use thiserror::Error;

/// Git's full SHA-1 hex length.
const FULL_SHA_LEN: usize = 40;
/// Minimum length Git accepts as an unambiguous short SHA.
const MIN_SHORT_SHA_LEN: usize = 7;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CommitShaError {
    #[error("Commit SHA must be non-empty")]
    Empty,

    #[error("Commit SHA '{0}' has invalid length {1}: expected 7-40 hex characters")]
    InvalidLength(String, usize),

    #[error("Commit SHA '{0}' is not valid hexadecimal")]
    NotHex(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CommitSha(String);

impl CommitSha {
    /// Constructs a `CommitSha` from a full (40-char) or short (7-39 char) hex string.
    /// Whitespace is trimmed; the value is normalised to lowercase.
    pub fn new(raw: impl AsRef<str>) -> Result<Self, CommitShaError> {
        let trimmed = raw.as_ref().trim();
        if trimmed.is_empty() {
            return Err(CommitShaError::Empty);
        }

        let len = trimmed.len();
        if !(MIN_SHORT_SHA_LEN..=FULL_SHA_LEN).contains(&len) {
            return Err(CommitShaError::InvalidLength(trimmed.to_string(), len));
        }

        if !trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(CommitShaError::NotHex(trimmed.to_string()));
        }

        Ok(Self(trimmed.to_ascii_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }

    pub fn is_full(&self) -> bool {
        self.0.len() == FULL_SHA_LEN
    }

    /// Returns the first `length` characters. Defaults to 7 if `length` is `None`.
    pub fn short(&self, length: Option<usize>) -> &str {
        let len = length.unwrap_or(MIN_SHORT_SHA_LEN).min(self.0.len());
        &self.0[..len]
    }
}

impl fmt::Display for CommitSha {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for CommitSha {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_full_sha() {
        let sha = CommitSha::new("abc1234567890abcdef1234567890abcdef12340").unwrap();
        assert!(sha.is_full());
    }

    #[test]
    fn accepts_short_sha() {
        let sha = CommitSha::new("abc1234").unwrap();
        assert!(!sha.is_full());
    }

    #[test]
    fn normalizes_to_lowercase() {
        assert_eq!(CommitSha::new("ABC1234").unwrap().as_str(), "abc1234");
    }

    #[test]
    fn trims_whitespace() {
        assert_eq!(CommitSha::new("  abc1234  ").unwrap().as_str(), "abc1234");
    }

    #[test]
    fn rejects_empty() {
        assert_eq!(CommitSha::new(""), Err(CommitShaError::Empty));
        assert_eq!(CommitSha::new("   "), Err(CommitShaError::Empty));
    }

    #[test]
    fn rejects_non_hex() {
        assert!(matches!(
            CommitSha::new("xyz1234"),
            Err(CommitShaError::NotHex(_))
        ));
    }

    #[test]
    fn rejects_too_short() {
        assert!(matches!(
            CommitSha::new("abc123"),
            Err(CommitShaError::InvalidLength(..))
        ));
    }

    #[test]
    fn rejects_too_long() {
        let long = "a".repeat(41);
        assert!(matches!(
            CommitSha::new(&long),
            Err(CommitShaError::InvalidLength(..))
        ));
    }

    #[test]
    fn short_returns_prefix() {
        let sha = CommitSha::new("abc1234567890abcdef1234567890abcdef12340").unwrap();
        assert_eq!(sha.short(None), "abc1234");
        assert_eq!(sha.short(Some(10)), "abc1234567");
    }

    #[test]
    fn short_clamps_to_value_length() {
        let sha = CommitSha::new("abc1234").unwrap();
        assert_eq!(sha.short(Some(20)), "abc1234");
    }

    /// Pins the FE/BE contract — see branch_name.rs for the pattern.
    #[test]
    fn commit_sha_contract() {
        const CASES: &str = include_str!("../../../../../../tests/contracts/commit-sha.cases.json");

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
                CommitSha::new(input).is_ok(),
                "expected valid case {:?} to be accepted",
                input
            );
        }

        for case in &cases.invalid {
            assert!(
                CommitSha::new(&case.input).is_err(),
                "expected invalid case {:?} ({}) to be rejected",
                case.input,
                case.reason
            );
        }
    }
}

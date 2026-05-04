//! TODO(step-10-migration): wire BranchName at command/git boundaries.
//! Today every command and git op accepts raw `String` for branch names.
//! Replace those with `BranchName` so validation happens once at the boundary
//! instead of being scattered (or skipped) across call sites. See
//! git-check-ref-format rules: https://git-scm.com/docs/git-check-ref-format
//!
//! Mirrors the FE Value Object at
//! src/domains/branch-management/core/models/branch-name.ts — keep validation
//! rules in sync (or pin via contract tests, §5).

#![allow(dead_code)]

use std::fmt;

use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum BranchNameError {
    #[error("Branch name must be non-empty")]
    Empty,

    #[error("Branch name '{0}' is invalid: {1}")]
    Invalid(String, &'static str),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct BranchName(String);

impl BranchName {
    /// Constructs a `BranchName` after applying Git's refname rules.
    /// Whitespace is trimmed; the input must satisfy `git check-ref-format`.
    pub fn new(raw: impl Into<String>) -> Result<Self, BranchNameError> {
        let trimmed = raw.into().trim().to_string();

        if trimmed.is_empty() {
            return Err(BranchNameError::Empty);
        }

        validate(&trimmed)?;

        Ok(Self(trimmed))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

impl fmt::Display for BranchName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl AsRef<str> for BranchName {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

fn validate(name: &str) -> Result<(), BranchNameError> {
    let invalid = |reason: &'static str| BranchNameError::Invalid(name.to_string(), reason);

    if name.starts_with('.') {
        return Err(invalid("cannot start with a dot"));
    }
    if name.ends_with('.') {
        return Err(invalid("cannot end with a dot"));
    }
    if name.ends_with(".lock") {
        return Err(invalid("cannot end with .lock"));
    }
    if name.starts_with('/') {
        return Err(invalid("cannot start with a slash"));
    }
    if name.ends_with('/') {
        return Err(invalid("cannot end with a slash"));
    }
    if name.contains("..") {
        return Err(invalid("cannot contain consecutive dots"));
    }
    if name.contains("//") {
        return Err(invalid("cannot contain consecutive slashes"));
    }
    if name == "@" {
        return Err(invalid("cannot be the single character '@'"));
    }
    if name.contains("@{") {
        return Err(invalid("cannot contain the sequence '@{'"));
    }
    if name.contains('\\') {
        return Err(invalid("cannot contain a backslash"));
    }

    for ch in name.chars() {
        match ch {
            ' ' | '~' | '^' | ':' | '?' | '*' | '[' | ']' => {
                return Err(invalid("cannot contain space or any of: ~ ^ : ? * [ ]"));
            }
            c if c.is_ascii_control() => {
                return Err(invalid("cannot contain ASCII control characters"));
            }
            _ => {}
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_simple_names() {
        assert_eq!(BranchName::new("main").unwrap().as_str(), "main");
        assert_eq!(
            BranchName::new("feature/login").unwrap().as_str(),
            "feature/login"
        );
        assert_eq!(BranchName::new("v1.0.0-rc").unwrap().as_str(), "v1.0.0-rc");
    }

    #[test]
    fn trims_whitespace() {
        assert_eq!(BranchName::new("  main  ").unwrap().as_str(), "main");
    }

    #[test]
    fn rejects_empty() {
        assert_eq!(BranchName::new(""), Err(BranchNameError::Empty));
        assert_eq!(BranchName::new("   "), Err(BranchNameError::Empty));
    }

    #[test]
    fn rejects_dot_boundaries() {
        assert!(matches!(
            BranchName::new(".main"),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("main."),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("feature.lock"),
            Err(BranchNameError::Invalid(..))
        ));
    }

    #[test]
    fn rejects_consecutive_separators() {
        assert!(matches!(
            BranchName::new("a..b"),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("a//b"),
            Err(BranchNameError::Invalid(..))
        ));
    }

    #[test]
    fn rejects_forbidden_chars() {
        for bad in [
            "with space",
            "with~tilde",
            "with^caret",
            "with:colon",
            "with?q",
            "with*star",
            "with[bracket]",
            "back\\slash",
        ] {
            assert!(
                matches!(BranchName::new(bad), Err(BranchNameError::Invalid(..))),
                "expected '{}' to be rejected",
                bad
            );
        }
    }

    #[test]
    fn rejects_at_sequences() {
        assert!(matches!(
            BranchName::new("@"),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("foo@{1}"),
            Err(BranchNameError::Invalid(..))
        ));
    }

    #[test]
    fn rejects_slash_boundaries() {
        assert!(matches!(
            BranchName::new("/main"),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("main/"),
            Err(BranchNameError::Invalid(..))
        ));
    }

    #[test]
    fn rejects_control_chars() {
        assert!(matches!(
            BranchName::new("a\nb"),
            Err(BranchNameError::Invalid(..))
        ));
        assert!(matches!(
            BranchName::new("a\tb"),
            Err(BranchNameError::Invalid(..))
        ));
    }

    #[test]
    fn equality_uses_value() {
        let a = BranchName::new("main").unwrap();
        let b = BranchName::new("main").unwrap();
        assert_eq!(a, b);
    }
}

//! The built-in safety allowlist of regenerable dependency/build folder names.
//!
//! Cleanable folders are discovered from each repository's `.gitignore`, but the
//! allowlist is a non-configurable safety net: these well-known names are always
//! considered cleanable (even when a repo has no `.gitignore`), and — together
//! with the folder names the user explicitly approves from `.gitignore` assist —
//! they form the only set of names `clean_repository` will ever delete (§3, the
//! server-side security boundary).

use std::collections::HashSet;

/// Well-known regenerable dependency/build folder names.
pub const DEFAULT_ALLOWLIST: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".venv",
    "__pycache__",
    ".gradle",
    ".dart_tool",
    "Pods",
    "vendor",
    "out",
    ".turbo",
];

/// The built-in allowlist as an owned lookup set.
pub fn default_allowlist() -> HashSet<String> {
    DEFAULT_ALLOWLIST.iter().map(|s| s.to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_allowlist_contains_well_known_names() {
        let set = default_allowlist();
        assert!(set.contains("node_modules"));
        assert!(set.contains("target"));
        assert!(set.contains(".venv"));
        assert_eq!(set.len(), DEFAULT_ALLOWLIST.len());
    }
}

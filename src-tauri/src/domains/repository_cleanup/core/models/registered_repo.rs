//! A repository already registered with the app, as this domain needs it for
//! staleness scanning. Populated by the `RepositoryCatalog` port (§1.2, §1.4
//! ACL) — a deliberately minimal projection of `repository_management`'s
//! `Repository`, so that domain's shape can change without touching this one.

/// Minimal repository identity + location needed to scan for stale targets.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegisteredRepo {
    pub id: String,
    pub name: String,
    pub path: String,
}

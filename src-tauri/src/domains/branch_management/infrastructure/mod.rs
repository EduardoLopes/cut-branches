//! Infrastructure adapters for branch management: git2-backed operations and
//! (Phase 5) this domain's own persistence. Implements ports defined in
//! `core/models/`; depends downward on the domain and shared kernel only.

pub(crate) mod git;
pub(crate) mod repositories;

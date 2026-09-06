//! Infrastructure adapters for repository management: filesystem-backed
//! repo-state timestamping and (Phase 5) this domain's own persistence.

pub(crate) mod repositories;
pub(crate) mod scanner;
pub(crate) mod state_hash;

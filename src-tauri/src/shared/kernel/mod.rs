//! Shared kernel (§1.4): a deliberately small, frozen set of cross-domain
//! contracts and types shared by more than one domain. Holds *data the domains
//! agree on*, never shared *behavior* — behavior belongs inside each domain's
//! own `core/`. Keep this ruthlessly small.

pub mod branch;

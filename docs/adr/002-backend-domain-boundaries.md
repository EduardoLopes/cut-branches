# ADR 002: Backend Domain Boundaries & Cross-Domain Ratchet

## Status

Accepted (2026-07-03) — supersedes nothing. Records an in-progress migration; sections marked **Deferred** are not yet implemented.

## Context

The Rust/Tauri backend (`src-tauri/src`) already followed a `domains/` layout
(`branch_management`, `repository_management`, `path_operations`) but had several
boundary-level departures from the feature-driven guide (`docs/code-design-guide.md`):
infrastructure was named `git/` and scattered across layers, the Diesel/SQLite layer
sat at the crate root, domains imported each other (§1.3), delivery skipped to
infrastructure, and there was no mechanical enforcement of the boundaries.

Rust gives **no compiler enforcement** of the no-cross-domain-import rule inside a
single crate (guide §1.7): any `pub(crate)` item in one domain is freely importable
from another. Enforcement therefore has to be external.

## Decision

1. **Shared kernel for the `Branch`/`Commit` contract.** The `Branch` and `Commit`
   DTOs — produced by `branch_management` and consumed by `repository_management` on
   repo load — live in `src/shared/kernel/branch.rs` as frozen, behavior-free contracts
   (§1.4). Both domains import them upward from the kernel; neither imports the other for
   these types. The DB-row → `Branch` mapping (`From<BranchRecord>`) stays in
   `branch_management`'s infrastructure.

2. **Shared infrastructure lives under `src/shared/infrastructure/`.** The Diesel/SQLite
   connection pool + migration runner (`db/`) and the shared git-repo validator (`git/`)
   moved there from the crate root and from `shared/git/`. The validator no longer depends
   on a domain error — it raises its own `RepoValidationError` (infrastructure error) that
   each consuming domain translates into its vocabulary via `From` (§3.2).

3. **Each domain owns an `infrastructure/` layer.** `git/` was renamed to
   `infrastructure/git/` in `branch_management`; git2/filesystem code was pulled out of the
   application layer into `infrastructure/` in `path_operations` and `repository_management`;
   the empty `repository_management/git/` stub was removed.

4. **Boundary enforcement by CI grep, as a ratchet (§6, §7).**
   `src-tauri/scripts/check-domain-boundaries.sh` flags (a) any `crate::domains::<B>::`
   reference from inside `domains/<A>/` (A≠B) and (b) any `crate::domains::` reference from
   inside `shared/`. Known violations are recorded in `domain-boundaries-baseline.txt`; the
   check fails only on **new** violations. It runs in CI (`rust-check.yml`) and pre-commit
   (`lefthook.yml`). It flips to blocking (`--strict`) once the baseline reaches empty.

## Consequences

- **Positive:** Cross-domain coupling is now visible and cannot silently grow. The
  `Branch` type coupling is resolved; the generated `bindings.ts` TS contract is unchanged.
- **Cost / accepted debt (baseline entries, to be cleared in the deferred phases below):**
  - `repository_management` still calls `branch_management`'s git functions + `sync`
    (`discovery.rs`, `create.rs`) and `path_operations::get_root_path` (`create.rs`).
  - `shared/infrastructure/db/operations.rs` imports `branch_management::filters`
    (infrastructure-depends-on-domain inversion).
- **Rust caveat:** enforcement is a CI grep, not the compiler. Compiler-enforced isolation
  would require one crate per domain in a Cargo workspace (guide §1.7) — out of scope here.

## Done since acceptance

- **Application layer decoupled from Tauri (guide §0.3).** Use-cases (`sync`, locked/selected
  branches, repository discovery) now take a pooled `DbConnection` instead of `tauri::State`;
  delivery handlers resolve it via `DatabaseState::connection()`. `core/application/` no longer
  imports the delivery framework.
- **Cross-domain dependencies inverted via ports (guide §1.3/§1.5).** `repository_management`
  defines `BranchGateway`/`PathGateway` ports in `core/ports.rs`; adapters at the crate-root
  composition module (`composition.rs`) are injected through Tauri managed state
  (`RepositoryServices`). The domain no longer imports `branch_management` or `path_operations`.
  Cross-domain violations dropped **4 → 1**; the baseline now holds only the
  `db/operations.rs → filters` inversion below.

## Deferred (planned, not yet implemented)

- **Data ownership (guide §1.3).** Split the shared Diesel `schema.rs`/`models.rs`/
  `operations.rs` so each domain owns its tables (`branches` → `branch_management`;
  `repositories`/`settings`/`metadata` → `repository_management`; `notifications` → a new
  domain), keeping the pool + migrations in shared infrastructure. This clears the last
  `db/operations.rs` inversion. **Note:** the split surfaces a real coupling —
  `bump_last_synced_at` writes the `repositories` table but is called from
  `branch_management`'s `sync`. The clean fix is to let the repository flow own that timestamp
  bump (it already sets `last_synced_at` on create/update), removing the redundant write from
  branch sync — a small behavioural change to confirm before landing.
- **Domain error + value-object adoption (the `step-4`/`step-10` markers).** Wire the
  `BranchError`/`RepositoryError` enums and `BranchName`/`CommitSha`/`RepositoryPath` value
  objects (currently dead-code) at call sites.
- **Cross-domain foreign keys.** The schema declares `branches → repositories` and
  `settings → repositories` FKs. Guide §1.3 forbids FK across a domain boundary; in the
  single-shared-DB phase these are retained as **documented debt**, to be replaced by
  reference-by-id in a follow-up SQLite migration (test against a copy of a real
  `app_data.db` first).

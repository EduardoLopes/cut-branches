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
  (The cross-domain call/import debt this section originally recorded has since been cleared —
  see "Done since acceptance" below; enforcement now runs in `--strict` mode.)
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
  Cross-domain violations dropped **4 → 1**.
- **DB queries split per owning domain (guide §1.3 data ownership).** The shared
  `db/operations.rs` was split: `branches`-table queries moved to
  `branch_management/infrastructure/repositories.rs`, `repositories`-table queries to
  `repository_management/infrastructure/repositories.rs`. The connection pool, migration
  runner, `schema.rs` and `models.rs` stay in shared infrastructure. Branch sync no longer
  writes the `repositories` table — `last_synced_at` is owned by the repository flow, which
  already sets it on create/update (the redundant bump was dropped). This cleared the last
  inversion: **cross-domain violations are now 0**, and enforcement was flipped to
  `--strict` (any violation now fails CI and pre-commit).
- **Domain error adoption complete (the `step-4` marker, §3.2).** `branch_management`'s 39
  git call sites now return typed `BranchError` variants (git2 error carried as `#[source]`);
  `repository_management`'s 5 domain-meaningful failures return `RepositoryError`. Both convert
  to `AppError` at the delivery boundary via `From`, byte-identical to the previous output
  (verified across all 44 sites). Per §3.3, unexpected DB-infrastructure failures deliberately
  remain opaque `AppError`s rather than becoming domain-error variants. `path_operations` already
  used `PathError`.

## Accepted deviation: delivery folder stays `commands/`, not `ipc/`

The guide names the Tauri delivery-layer folder `ipc/` (§1.1). We keep `commands/`: it is the
near-universal Tauri convention (it holds `#[tauri::command]` handlers), and `#[tauri::command]`
derives the IPC command name from the function, not the module path — so the folder name is
purely internal and a rename would be broad churn for no functional or contract gain. This is a
deliberate §0.6 deviation; the delivery _role_ and its boundary rules are unchanged.

## Migrations squashed to a single baseline (pre-release)

The SQLite schema had never shipped, so the 9 incremental migrations (which included
create-then-replace churn: `last_sync_hash` → timestamp, `selected/locked_branches` tables →
columns on `branches`) were squashed into one `create_initial_schema` baseline. While squashing
we also dropped dead schema: the unused `settings`, `notifications`, and `metadata` tables (+ their
model structs) and the deprecated `last_sync_hash` column. The baseline owns exactly two tables —
`repositories` and `branches` — and keeps the `branches → repositories` FK with `ON DELETE CASCADE`
as the accepted single-DB-phase cross-domain-FK debt below.

## Accepted debt: cross-domain FK (single shared DB)

The baseline keeps `branches.repository_id → repositories(id) ON DELETE CASCADE`. Guide §1.3 forbids
FKs across a domain boundary; here it is retained deliberately because the DB handles branch cleanup
on repository delete, and removing it would require the branch domain to own that cleanup (via an
injected port or delete event). To remove later: drop the FK, and have repository deletion invoke a
branch-domain cleanup use-case through a port (same pattern as `BranchGateway`).

## Deferred (planned, not yet implemented)

- **Physical `schema.rs`/`models.rs` split.** The `table!` definitions and row DTOs still live in
  shared infrastructure (the _queries_ are already split per domain). Splitting the generated
  `schema.rs` per domain is possible but low-value while the app is a single crate.
- **Value-object adoption (the `step-10` marker).** Wire the `BranchName`/`CommitSha`/
  `RepositoryPath` value objects (currently dead-code) through call sites that pass raw strings.
  **Note:** unlike the error adoption, this is _not_ a pure refactor — constructing a value object
  at a boundary runs its validation, which can reject inputs that previously flowed through
  (e.g. `BranchName` enforces `git check-ref-format`). Adopt at boundaries deliberately, deciding
  per site whether the new validation is desired.

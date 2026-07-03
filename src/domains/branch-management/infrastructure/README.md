# branch-management / infrastructure

Server-state **adapters** for the branch-management domain — thin wrappers over Tauri
IPC commands built on `$infrastructure/create-tauri-query` and
`$infrastructure/create-tauri-mutation` (see code-design-guide §1.2).

- `queries/` — `create-*-query.ts` read adapters (each wraps one command; some
  translate wire DTOs into domain models via `../../core/models/converters`).
- `mutations/` — `create-*-mutation.ts` write adapters.

Adapters know the transport and wire format only. The composables in
`../core/composables/` (application layer) consume them, apply filters/selection
state, and own cache-invalidation policy. Adapters must not import from
`../core/composables/` or from another domain.

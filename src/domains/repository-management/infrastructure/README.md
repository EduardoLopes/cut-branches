# repository-management / infrastructure

Server-state **adapters** for the repository-management domain — thin wrappers over
Tauri IPC commands built on `$infrastructure/create-tauri-query` and
`$infrastructure/create-tauri-mutation` (see code-design-guide §1.2).

- `queries/` — `create-*-query.ts` / `get-*-query.ts` read adapters.
- `mutations/` — `create-*-mutation.ts` write adapters.

Adapters know the transport and wire format only. The `repository.svelte.ts`
store and other composables in `../core/composables/` (application layer) consume
them. Adapters must not import from `../core/composables/` or from another domain.
Repository/branch adapters shared across domains live in the global
`src/infrastructure/` instead.

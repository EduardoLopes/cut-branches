# src/infrastructure/queries

**Shared** server-state read adapters — Tauri query wrappers consumed by more than
one domain, promoted here because domains may not import each other (code-design-guide
§1.3). Repository reads (`getRepository`, `getRepositoryList`) are used by
branch-management, repository-management, repository-navigation, onboarding and
`ui/core/footer`, so they live in the global infrastructure layer rather than in any
single domain.

Adapters that only one domain uses belong in that domain's
`infrastructure/queries/` instead. The generic transport plumbing
(`create-tauri-query`, `create-tauri-mutation`, `bindings`, …) lives one level up in
`src/infrastructure/`.

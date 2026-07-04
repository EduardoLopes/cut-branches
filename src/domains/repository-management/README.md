# Repository Management Domain

## Purpose

Handles the Git repository lifecycle within the app: adding, viewing, updating, and
removing repositories, plus the header shown at the top of a repository view.

## Responsibilities

- **Add** a repository by selecting a Git folder (validated on the backend)
- **View** repository metadata (name) and, in the header, the active/deleted branch counts
- **Update** a repository (invalidate its cached branch + repository queries to refetch)
- **Remove** a repository, then navigate to another repository or to onboarding

## Structure

```
repository-management/
├── components/                         # Delivery
│   ├── add-repository-button.svelte    # Opens the folder dialog and creates a repository
│   ├── back-button.svelte              # Generic back-navigation button
│   ├── repository-header.svelte        # Repo name + Active/Deleted branch tabs + options popover
│   ├── update-repository-button.svelte # Refetches the repo's branch/repository data
│   └── remove-repository-modal.svelte  # Confirm + delete a repository
├── core/composables/                   # Application — consuming hooks / stateful logic
│   ├── repository.svelte.ts            # RepositoryStore (per-repo UI state)
│   ├── queries/                        # TanStack Query hooks (wrap $utils/create-tauri-query)
│   │   ├── create-get-repository-query.ts
│   │   ├── create-get-repository-list-query.ts
│   │   ├── create-get-branches-query.ts
│   │   └── get-branch-list-query.ts
│   └── mutations/
│       ├── create-create-repository-mutation.ts
│       └── create-delete-repository-mutation.ts
└── views/
    └── repository-view.svelte          # Composes the header + page content (children)
```

Dependency flow: `views/ → components/ → core/composables/`. The query/mutation hooks call
the global transport (`$utils/create-tauri-query` / `$utils/create-tauri-mutation` over
`$infrastructure/bindings`), so the domain holds no transport code of its own.

## Inter-Domain Communication

This domain does **not** import from other domains (§1.3). The `add-repository-button` is
injected into other domains' UI (the sidebar, the onboarding welcome modal) via snippet
slots wired by the composition root — e.g. `routes/repos/+layout.svelte`,
`routes/repos/+page.svelte`, and `routes/+layout.svelte` (which injects it into the
onboarding `welcome-modal`). Cross-domain data refresh happens through the shared
TanStack Query cache (invalidation), not direct calls or an event bus.

## External Dependencies

- **Tauri commands** (via bindings): `createRepository`, `deleteRepository`, `getRepository`,
  `getRepositoryList`, `getBranchList`
- **TanStack Query** — server-state caching
- **SvelteKit** — `goto` / `resolve` for navigation

## Testing

- Component tests in `components/__tests__/`, composable tests in `core/composables/__tests__/`
- 100% branch coverage for new code

## Known cleanup opportunities

The following carry no production importer (only tests/mocks) and are candidates for removal:
`components/back-button.svelte`, `core/composables/repository.svelte.ts` (`RepositoryStore`,
which also calls `goto()` inside `set()` — delivery logic leaking into a store), and
`core/composables/queries/get-branch-list-query.ts` (duplicates `create-get-branches-query.ts`).

# Repository Navigation Domain

## Purpose

The repository-navigation domain provides the application sidebar: brand header, the
repository navigation list, and the collapsible-rail behavior. It lets the user switch
between repositories and see per-repository branch counts.

## Key Responsibilities

- Display application branding (logo + title) via the pindoba `Banner`
- Render the list of repositories as navigation items (`@pindoba/svelte-navigation`)
- Show repository metadata (branch counts) as badges
- Maintain active state for the current repository (from the route param)
- Collapse to an icons-only rail (persisted across sessions) and prefetch repository data on hover

## Components

### Views (Delivery)

- `sidebar-view.svelte` - Top-level sidebar; owns the collapsed UI state and composes the brand + list

### Components (Delivery)

- `sidebar-brand.svelte` - Brand header (logo Stamp + title) and the collapse/expand toggle
- `repository-nav-list.svelte` - Repository navigation list; renders the "Repositories" panel

## Business Rules

1. Repositories are displayed in alphabetical order by name
2. Branch count badges are only shown when count > 0
3. In the collapsed rail the list drops badges and auto-derives tooltips from the repo name
4. The active repository is highlighted based on the current route parameter
5. The collapsed/expanded preference is persisted to `localStorage` (`sidebar-collapsed`)

## Inter-Domain Communication

This domain never imports from other domains (§1.3). The add-repository button belongs to
`repository-management`; the route (`routes/repos/+layout.svelte`) acts as the composition
root and injects it into `sidebar-view` through the `repositoryListAction` snippet slot,
which flows down to `repository-nav-list` as `headerAction`. Cross-domain data refresh
happens through the shared TanStack Query cache, not direct calls.

## Dependencies

### Application (`core/composables/`)

- `create-prefetch-repository-data.ts` - Use-case: debounced prefetch of a repo's branch
  list + details on hover (via the shared `$utils/create-tauri-query` transport)

### Infrastructure (`infrastructure/queries/`)

- `create-get-repository-list-query.ts` - Transport adapter wrapping the `getRepositoryList`
  Tauri command (§1.2). Duplicated per-domain by design; not shared across domains (§1.3–1.4).

### UI Components

- `$ui/core/icon-button.svelte` - The collapse/expand toggle
- `@pindoba/svelte-banner`, `@pindoba/svelte-navigation`, `@pindoba/svelte-stamp`,
  `@pindoba/svelte-badge`, `@pindoba/svelte-loading`

## Domain Structure

```
repository-navigation/
├─ views/                    # Delivery — top-level sidebar
│  └─ sidebar-view.svelte
├─ components/               # Delivery — sidebar pieces
│  ├─ sidebar-brand.svelte
│  └─ repository-nav-list.svelte
├─ core/composables/         # Application — use-cases / consuming logic
│  └─ create-prefetch-repository-data.ts
└─ infrastructure/queries/   # Infrastructure — transport adapters
   └─ create-get-repository-list-query.ts
```

Dependency flow: `views/ → components/ → core/composables/ → infrastructure/queries/`.

## State Management

Server state uses TanStack Query (`createGetRepositoryListQuery`). The only local state is
the sidebar's collapsed flag, held in `sidebar-view.svelte` (delivery-layer UI state) and
persisted to `localStorage`.

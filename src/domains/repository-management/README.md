# Repository Management Domain

## Purpose

The Repository Management domain handles all operations related to Git repository lifecycle within the application. It provides functionality for adding, viewing, updating, and removing repositories from the application's workspace.

## Responsibilities

### Core Responsibilities

- **Repository Discovery**: Allow users to select and add Git repositories to the application
- **Repository Information**: Display repository metadata (name, path, current branch, branch count)
- **Repository Removal**: Handle safe removal of repositories from the application
- **Repository Navigation**: Manage navigation between repository views
- **Repository State**: Track current active repository state

### Business Rules

1. **Repository Path Validation**: Only valid Git repositories can be added
2. **Unique Repository Paths**: The same repository path cannot be added twice
3. **Safe Removal**: When removing a repository:
   - Clear all associated branch selections
   - Clear all locked branches
   - Clear search state
   - Navigate to another repository or onboarding if none remain
4. **Current Repository Tracking**: The application always knows which repository is currently active

## Domain Structure

```
repository-management/
├── README.md                    # This file
├── components/                  # UI components specific to repository management
│   ├── __tests__/              # Component tests
│   ├── add-button.svelte       # Button to add new repositories
│   ├── back-button.svelte      # Navigation back button
│   ├── branch-restoration-header.svelte
│   ├── remove-repository-modal.svelte
│   ├── repository-management-header.svelte
│   ├── restore-repository-button.svelte
│   └── update-repository-button.svelte
├── core/                        # Core business logic (renamed from logic/)
│   └── composables/            # Application logic layer
│       ├── __tests__/          # Composable tests
│       ├── add-repository-handler.svelte.ts
│       ├── mutations/          # TanStack Query mutations
│       │   ├── create-create-repository-mutation.ts
│       │   └── create-delete-repository-mutation.ts
│       └── queries/            # TanStack Query queries
│           ├── create-get-branches-query.ts
│           ├── create-get-repository-list-query.ts
│           ├── create-get-repository-query.ts
│           └── get-branch-list-query.ts
├── store/                       # Domain-specific state management
│   └── repository.svelte.ts    # Repository UI state store
└── views/                       # Top-level view components
    ├── __tests__/              # View tests
    └── repository-view.svelte  # Main repository view
```

## Key Interactions

### Event Bus Communication

This domain communicates with other domains through the global event bus:

**Published Events:**

- `REPOSITORY_ADD_REQUESTED` - Request to add a new repository
- `REPOSITORY_ADDING` - Repository creation in progress
- `REPOSITORY_ADDED` - Repository successfully added (payload: Repository)
- `REPOSITORY_ADD_FAILED` - Repository addition failed
- `REPOSITORY_DELETED` - Repository removed from application (payload: { id, repoId })

**Subscribed Events:**

- `REPOSITORY_ADD_REQUESTED` - Listens for add requests to trigger folder selection dialog

### Global Services Used

- `$services/event-bus` - Cross-domain event communication
- `$services/notifications` - Global notification system (promoted from notifications domain)
- `$services/common` - Shared type definitions and schemas

### External Dependencies

- **Tauri Commands**: `createRepository`, `deleteRepository`, `getRepository`, `getRepositoryList`
- **TanStack Query**: For server state management and caching
- **Svelte Navigation**: `goto`, `resolve` from `$app/navigation`

## Data Flow

### Adding a Repository

1. User clicks "Add Repository" button
2. Button publishes `REPOSITORY_ADD_REQUESTED` event
3. `add-repository-handler` subscribes to event and opens folder dialog
4. On folder selection, creates repository via `createCreateRepositoryMutation`
5. Publishes `REPOSITORY_ADDING` event
6. On success:
   - Shows success notification
   - Publishes `REPOSITORY_ADDED` event
   - Navigates to new repository view
7. On error:
   - Shows error notification
   - Publishes `REPOSITORY_ADD_FAILED` event

### Removing a Repository

1. User clicks "Remove" button in repository header
2. Modal opens for confirmation
3. On confirmation:
   - Publishes `REPOSITORY_DELETED` event (other domains clean up their data)
   - Clears branch selections via mutation
   - Clears locked branches via mutation
   - Deletes repository via `createDeleteRepositoryMutation`
   - Navigates to another repository or onboarding
   - Shows success notification

## Testing Strategy

### Unit Tests

- Component behavior tests in `components/__tests__/`
- View tests in `views/__tests__/`
- Composable tests in `core/composables/__tests__/` (TODO: to be added)

### Coverage Requirements

- 100% branch coverage for all new code
- Integration tests for complex repository flows

## Key Patterns

### Composable Pattern

- Stateful logic encapsulated in composables
- Reactive state using Svelte 5 runes (`$derived`, `$effect`)
- Return getter-based API for reactive access

### Query/Mutation Pattern

- Separation of reads (queries) and writes (mutations)
- Factory functions for query/mutation creation
- Automatic cache invalidation and refetch

### Event-Driven Architecture

- Domains publish events for state changes
- Domains subscribe to events they care about
- No direct coupling between domains

## Architecture Compliance

This domain follows the **Framework-Agnostic Frontend Architecture** principles:

- ✅ Self-contained vertical slice
- ✅ High cohesion (all repository logic together)
- ⚠️ Low coupling (needs refactoring to remove direct domain imports)
- ✅ Clear separation of concerns (composables, components, views)
- ⚠️ Domain isolation (partially - some components still import from other domains)

## Known Issues & Technical Debt

1. **Domain Isolation Violations** (CRITICAL):
   - `remove-repository-modal.svelte` directly imports from `branch-management`, `notifications`, and `onboarding` domains
   - Should be refactored to use event bus for cross-domain communication

2. **Missing Tests**:
   - No tests for composables in `core/composables/`
   - Need comprehensive test coverage for business logic

3. **Directory Structure**:
   - Currently using `logic/application/` - should be renamed to `core/composables/` per guidelines

4. **Value Objects**:
   - Could benefit from Value Objects for `RepositoryPath`, `RepositoryId`, `RepositoryName`
   - Would provide better validation and type safety

## Future Improvements

- [ ] Refactor `remove-repository-modal.svelte` to use event bus
- [ ] Add comprehensive tests for all composables
- [ ] Introduce Value Objects for domain concepts
- [ ] Complete directory structure migration to `core/composables/`
- [ ] Document all event payloads in a shared event contract

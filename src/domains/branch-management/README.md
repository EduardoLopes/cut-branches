# Branch Management Domain

## Overview

The Branch Management domain provides comprehensive functionality for managing Git repository branches. It handles all branch-related operations including viewing, selecting, deleting, restoring, locking, and switching between branches.

## Purpose

This domain encapsulates all business logic and UI components related to Git branch lifecycle management, enabling users to:

- View active and deleted branches with detailed commit information
- Select branches individually or in bulk
- Delete branches with merge status verification
- Restore previously deleted branches
- Lock/unlock branches to prevent accidental deletion
- Switch between branches
- Search and filter branches

## Key Responsibilities

### Branch Viewing

- Display active branches in the repository
- Show deleted branches for restoration
- Present branch metadata (last commit, author, date, merge status)
- Real-time branch list updates

### Branch Selection

- Individual branch selection via checkboxes
- Bulk selection ("select all" functionality)
- Selection state management per repository
- Context-aware selection (active vs. deleted branches)
- Locked branch protection (cannot be selected)

### Branch Operations

- **Delete**: Remove active branches with merge status checks
- **Restore**: Recover deleted branches with conflict resolution
- **Lock/Unlock**: Toggle branch protection status
- **Switch**: Change current branch

### Search & Filtering

- Real-time branch name search
- Filter by deletion status (active/deleted)
- Filter by selection status
- Filter by merge status

## Business Rules

### Selection Rules

1. The current branch cannot be selected or deleted
2. Locked branches cannot be selected or deleted
3. Selection state is isolated per repository
4. Selection context is maintained separately for active and deleted views

### Deletion Rules

1. Cannot delete the current branch
2. Cannot delete locked branches
3. Merge status warnings for unmerged branches
4. Batch deletion support with transaction-like behavior
5. Deleted branches are soft-deleted and can be restored

### Locking Rules

1. Locked branches cannot be selected
2. Locked branches cannot be deleted
3. Lock status persists across sessions
4. Locking a branch automatically deselects it

### Restoration Rules

1. Only deleted branches can be restored
2. Conflict resolution required if branch exists
3. Restore operations may require user confirmation
4. Batch restoration supported

## Directory Structure

```
branch-management/
├── core/
│   └── composables/         # Application logic & data management
│       ├── use-active-branches-view.svelte.ts
│       ├── use-deleted-branches-view.svelte.ts
│       ├── use-branch-selection.svelte.ts
│       ├── create-get-branches-query.ts
│       ├── create-get-repository-query.ts
│       ├── create-delete-branches-mutation.ts
│       ├── create-restore-deleted-branch-mutation.ts
│       ├── create-locked-branches-query.ts
│       ├── create-selected-branches-query.ts
│       └── ... (other queries and mutations)
├── components/              # UI components
│   ├── branch-list.svelte
│   ├── branch-selection.svelte
│   ├── delete-branch-modal.svelte
│   ├── restore-deleted-branch-modal.svelte
│   ├── lock-branch-toggle.svelte
│   ├── search-input.svelte
│   └── ... (other components)
├── views/                   # Top-level view components
│   ├── active-branches-view.svelte
│   └── deleted-branches-view.svelte
├── store/                   # Domain-specific state
│   ├── search-branches.svelte.ts
│   ├── selected-branches.svelte.ts
│   └── deleted-branches.svelte.ts
├── utils/                   # Helper functions
│   ├── branch-utils.ts
│   ├── filter-branches-by-search.ts
│   ├── calculate-selection-state.ts
│   └── ... (other utilities)
└── README.md               # This file
```

## Core Composables

### View Composables

- **`useActiveBranchesView`**: Orchestrates active branches view state
- **`useDeletedBranchesView`**: Orchestrates deleted branches view state
- **`useBranchSelection`**: Manages branch selection logic

### Query Composables

- **`createGetBranchesQuery`**: Fetch branches with filters
- **`createGetRepositoryQuery`**: Fetch repository details
- **`createLockedBranchesQuery`**: Fetch locked branches
- **`createSelectedBranchesQuery`**: Fetch selected branches
- **`createBranchMergeStatusQuery`**: Check merge status

### Mutation Composables

- **`createDeleteBranchesMutation`**: Delete branches
- **`createRestoreDeletedBranchMutation`**: Restore deleted branches
- **`createAddLockedBranchesMutation`**: Lock branches
- **`createRemoveLockedBranchesMutation`**: Unlock branches
- **`createUpdateBranchSelectionMutation`**: Update selection state
- **`createSwitchBranchMutation`**: Switch current branch

## Domain Interactions

### Internal Dependencies

- Uses `store/` for local state management (search, selection)
- Uses `utils/` for domain-specific helper functions

### External Dependencies

#### From Repository Management Domain

- Repository data (ID, path, current branch)
- Repository context for branch operations

#### From Notifications Domain

- Success/error notifications for operations
- Toast messages for user feedback

#### To Global Services

- Tauri commands for Git operations via `$infrastructure/bindings`
- TanStack Query for data fetching and caching

### Communication Patterns

- **No direct domain-to-domain imports** (follows architecture rules)
- Events/callbacks for cross-domain communication
- Shared services for common infrastructure

## State Management

### Local State (Domain Store)

- **Search State**: Per-repository search queries
- **Selection State**: Per-repository branch selection
- **Deleted Branches**: Tracking deleted branches for UI feedback

### Server State (TanStack Query)

- Branch lists (active/deleted)
- Repository information
- Locked branches
- Selected branches
- Merge status

### Cache Strategy

- Automatic invalidation on mutations
- Optimistic updates for selection changes
- Real-time updates via query refetch

## Testing Strategy

- Unit tests for composables and utilities
- Component tests for UI components
- Integration tests for complex flows
- 100% branch coverage requirement
- Co-located tests in `__tests__/` directories

## Key Patterns

### Composable Pattern

- Stateful logic encapsulated in composables
- Reactive state using Svelte 5 runes (`$derived`, `$effect`)
- Return getter-based API for reactive access

### Query/Mutation Pattern

- Separation of reads (queries) and writes (mutations)
- Factory functions for query/mutation creation
- Automatic cache invalidation and refetch

### View-State Pattern

- Views delegate logic to composables
- Views are thin orchestration layers
- Composables manage derived state and side effects

## Architecture Compliance

This domain follows the **Framework-Agnostic Frontend Architecture** principles:

- ✅ Self-contained vertical slice
- ✅ High cohesion (all branch logic together)
- ✅ Low coupling (no direct imports from other domains)
- ✅ Clear separation of concerns (composables, components, views)
- ✅ Domain isolation (uses global event bus for cross-domain communication)

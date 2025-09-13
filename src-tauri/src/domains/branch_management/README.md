# Branch Management Domain

This domain handles all branch-related operations in the Git repository.

## Responsibilities

- Branch deletion (single and bulk operations)
- Branch restoration from deleted state
- Branch switching/checkout
- Branch listing and information retrieval

## Key Components

- **Commands**: Tauri command handlers for branch operations
- **Services**: Business logic for branch management
- **Git**: Git-specific operations for branches and commits
- **Types**: Data structures for branches, commits, and deletion info
- **Events**: Domain events for branch state changes

## Business Rules

- Branches can only be deleted if they are not the current branch
- Deleted branches can be restored if the commit still exists
- Branch switching validates the target branch exists
- All operations emit appropriate events for UI notifications
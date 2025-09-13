# Repository Management Domain

This domain handles repository-level operations and information.

## Responsibilities

- Repository information retrieval
- Repository validation and discovery
- Repository state management

## Key Components

- **Commands**: Tauri command handlers for repository operations
- **Services**: Business logic for repository management
- **Git**: Git-specific repository operations
- **Types**: Data structures for repository information
- **Events**: Domain events for repository state changes

## Business Rules

- Repository must be a valid Git repository
- Repository information includes branch count and metadata
- Repository discovery validates Git directory structure
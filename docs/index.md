# Cut Branches Documentation

Cut Branches is a desktop application built with Tauri (Rust backend) and Svelte 5 (frontend) that helps users manage and delete local Git branches.

## Architecture Diagrams

- [System Overview](system-overview.md) - High-level architecture of the application
- [Component Diagram](component-diagram.md) - Detailed view of internal components

## Key Features

1. View all branches in a Git repository with their details (last commit, author, date)
2. Select branches for deletion
3. Switch between branches
4. Lock branches to prevent accidental deletion
5. Search branches
6. Filter branches (merged/not merged)
7. Pagination for repositories with many branches

## Technology Stack

- **Frontend**: Svelte 5, SvelteKit
- **UI Components**: Pindoba design system
- **Backend**: Tauri with Rust
- **State Management**: Svelte stores
- **API Communication**: Tauri API

# Repository Navigation Domain

## Purpose

The repository-navigation domain is responsible for providing the main application navigation structure, including the app header/branding and repository list navigation menu.

## Key Responsibilities

- Display application branding (logo and title)
- Render the list of repositories as navigation items
- Trigger repository addition through the global event bus
- Show repository metadata (branch counts) as badges
- Maintain active state for current repository

## Components

### Views

- `menu-view.svelte` - Main navigation view that composes the header and repository list

### Components

- `app-header.svelte` - Application branding and header section
- `repository-list.svelte` - Repository navigation list with add button

## Business Rules

1. Repositories are displayed in alphabetical order by name
2. Branch count badges are only shown when count > 0
3. The navigation uses the global event bus to request repository additions (does not directly import from other domains)
4. The active repository is highlighted based on the current route parameter

## Inter-Domain Communication

This domain communicates with other domains exclusively through the global event bus:

### Published Events

- None (this domain only subscribes)

### Subscribed Events

- None currently (may subscribe to REPOSITORY_ADDED in the future to show success feedback)

### Event Bus Requests

- `Events.REPOSITORY_ADD_REQUESTED` - Published when user clicks the add repository button

## Dependencies

### Global Services

- `$services/event-bus` - For inter-domain communication

### Domain Composables

- `core/composables/create-get-repository-list-query` - TanStack Query wrapper for fetching repository list

### UI Components

- `$ui/core/icon-button.svelte` - For the add repository button
- `@pindoba/svelte-navigation` - External navigation component library

## Domain Structure

This domain follows the standard domain-driven structure:

- `components/` - UI components used within this feature
  - `app-header.svelte` - Application branding
  - `repository-list.svelte` - Repository navigation list
- `core/composables/` - Application logic layer (stateful, framework-dependent)
  - `create-get-repository-list-query.ts` - TanStack Query wrapper
- `views/` - Top-level presentational components
  - `menu-view.svelte` - Main navigation view

## State Management

This domain uses TanStack Query for server state management via the domain-specific `createGetRepositoryListQuery` composable. No additional local state management is needed.

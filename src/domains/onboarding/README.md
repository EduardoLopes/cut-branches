# Onboarding Domain

## Purpose

The onboarding domain handles the first-time user experience for Cut Branches. Rather than a dedicated full-screen page, it presents a **welcome modal** over the real app shell and lets users add their first Git repository from there.

## Key Responsibilities

- Present a welcome modal (hero + call-to-action) whenever no repositories are configured
- Route users into the app shell (`/repos`) so the sidebar and empty state are visible behind the modal
- Redirect users to their first repository once one exists

## Business Rules

- The welcome modal is shown whenever the repository list is empty
- Closing the modal (`Continue`, Escape, or the close button) dismisses it for the session; it re-arms if every repository is later removed
- Adding a repository closes the modal and navigates to that repository

## Structure

### Components

- `welcome-modal.svelte` - Two-panel welcome modal (info panel + accent visual panel) shown when the repository list is empty; receives the add-repository action as a snippet from the composition root
- `redirect-to-app.svelte` - Routes empty users to the app shell and users with repositories to their first repository

### Core Logic

- `core/composables/` - TanStack Query definitions for repository data fetching
  - `create-get-repository-list-query.ts` - Query for fetching all repositories
  - `create-get-repository-query.ts` - Query for fetching a specific repository

## Interactions

This domain uses global services for:

- Repository data fetching via Tauri commands
- Navigation to repository management and main application views
- No direct communication with other domains (follows domain isolation principle)

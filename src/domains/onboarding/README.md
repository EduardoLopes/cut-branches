# Onboarding Domain

## Purpose

The onboarding domain handles the first-time user experience for Cut Branches. It guides users through selecting their first Git repository and getting started with the application.

## Key Responsibilities

- Display welcome screen with hero message and call-to-action
- Provide repository selection interface for new users
- Redirect users to main application after onboarding completion
- Handle empty state when no repositories are configured

## Business Rules

- Users must select at least one repository before proceeding to the main application
- Onboarding is shown only when no repositories are configured
- Users can skip directly to repository management if preferred

## Structure

### Components

- `onboarding-hero.svelte` - Welcome message and application introduction
- `onboarding-cta.svelte` - Call-to-action button for repository selection
- `redirect-to-get-started.svelte` - Navigation component for routing users

### Views

- `onboarding-view.svelte` - Main onboarding page composition

### Core Logic

- `core/composables/` - TanStack Query definitions for repository data fetching
  - `create-get-repository-list-query.ts` - Query for fetching all repositories
  - `create-get-repository-query.ts` - Query for fetching a specific repository

## Interactions

This domain uses global services for:

- Repository data fetching via Tauri commands
- Navigation to repository management and main application views
- No direct communication with other domains (follows domain isolation principle)

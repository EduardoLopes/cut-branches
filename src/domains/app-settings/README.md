# app-settings

Application-wide settings, surfaced at the `/settings` route and reached from a
Settings entry at the bottom of the sidebar.

## Responsibilities

- **Feature flags** — a panel for turning in-development features on or off so
  they can ship hidden until ready.

## Structure

- `views/settings-view.svelte` — the settings page (header + sections).
- `components/feature-flag-toggle.svelte` — a single flag row (label,
  description, checkbox).

## Feature flags

The flag **registry, persistence, and read API** are global (cross-cutting), so
they live in [`$lib/feature-flags.svelte.ts`](../../lib/feature-flags.svelte.ts)
— any domain can gate a feature with `isFeatureEnabled('<key>')` without
importing this domain. This view is only the delivery layer that renders and
edits those flags.

To add a flag: add an entry to `FEATURE_FLAGS` in the registry and it appears
here automatically.

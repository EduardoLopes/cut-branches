# app-settings

Application-wide settings, surfaced at the `/settings` route and reached from a
Settings entry at the bottom of the sidebar.

## Responsibilities

- **Feature flags** — a panel for turning in-development features on or off so
  they can ship hidden until ready.
- **About** — app/environment info, external links, and diagnostics actions.

Note: the **Cleanup** settings section is owned by the `repository-cleanup`
domain (`repository-cleanup/components/cleanup-settings-panel.svelte`) and
composed into the settings area at the route, not by this domain.

## Structure

- `views/settings-shell.svelte` — the settings shell: sidebar section nav +
  search, with a slot for the active section's panel (rendered by each
  `src/routes/settings/*/+page.svelte`).
- `components/feature-flags-panel.svelte` — the "Feature flags" section: one
  pindoba `List`, a row per flag (icon, label, description, checkbox).
- `components/about-panel.svelte` — the "About" section.

Sections compose the shared, global
[`$ui/patterns/settings-section.svelte`](../../ui/patterns/settings-section.svelte)
(header + recessed well) and fill it with pindoba `List`s: stacked rows
(label + description + trailing control) for settings, `layout="pairs"` for
read-only facts. So every settings page follows one visual convention.

## Feature flags

The flag **registry, persistence, and read API** are global (cross-cutting), so
they live in [`$lib/feature-flags.svelte.ts`](../../lib/feature-flags.svelte.ts)
— any domain can gate a feature with `isFeatureEnabled('<key>')` without
importing this domain. This view is only the delivery layer that renders and
edits those flags.

To add a flag: add an entry to `FEATURE_FLAGS` in the registry and it appears
here automatically.

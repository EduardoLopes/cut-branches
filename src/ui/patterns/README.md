# ui/patterns

Composed, opinionated UI solutions built from `ui/core/` atoms and Pindoba
primitives. Unlike `ui/core/` (abstract, single-purpose building blocks), a
pattern encodes a specific composition + convention that multiple features
reuse.

These live here (globally) rather than in a domain because they are consumed by
more than one domain — e.g. the settings patterns are used by both
`app-settings` (Feature flags, About) and `repository-cleanup` (the Cleanup
settings section). Putting them in a domain would force a cross-domain import,
which the architecture forbids.

## Settings convention

Every settings section shares one visual language via two components:

### `settings-section.svelte`

The section frame: a header Banner + a recessed "well" that holds the rows.

- Props: `heading`, `subheading?`, `leading?` (icon Stamp snippet), `trailing?`
  (header action, e.g. a reset button), `testId?`, `children` (the rows).
- Canonical well: `background: neutral.surface.deep`, `borderRadius: xl`,
  `1px neutral.border.muted`, `padding: md`, `gap: sm`, scrolls itself.

### `settings-field.svelte`

A single row: label + optional help text on the left, an optional control or
read-only value on the right. Built on the Pindoba `Card` (its header is a
Banner).

- Props: `heading`, `subheading?`, `leading?`, `control?` (right-aligned
  snippet) or `value?` (right-aligned read-only mono text), `align?`
  (`'center'` default | `'start'`), plus `as` / `interactive` / `background` /
  `feedback` / `border` / `class` / `testId` for polymorphic, clickable rows.
- Canonical card: `size: sm`, `background: surface.step.2`, `border: default`
  (raised above the section's `deep` well).

## Conventions

- **Header Stamp:** sections pass their own leading Stamp
  (`shape="square" size="lg" emphasis="secondary" feedback="neutral" shadow="sm"`).
  The About section is a deliberate **identity exception** — it uses a
  `shape="circle" emphasis="primary" feedback="primary"` stamp to brand the app.
- **Snippet props** passed to `leading`/`trailing`/`control` may need an
  `as Snippet` / `as BannerProps['leading']` cast at the call site, due to
  branding differences between the app's and Pindoba's bundled `svelte` types.

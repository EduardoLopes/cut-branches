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

## Page convention

Every page — repository, worktrees, commit history, diff, cleanup, settings —
is built from the same four pieces, so a new page has no layout decisions left
to make:

```
PageShell                  full-height host, one background, the minHeight:0 chain
├── PageHeader             breadcrumb? · leading icon · heading · subheading? · actions
│   └── nav?               CONTEXT navigation — links to sibling pages
└── PageWell               recessed Panel (surface.ground, radius xl), publishes its
    │                      radius so cards inside use radius="inner"
    ├── PageToolbar?       FILTERS, search and bulk actions (sticky, translucent)
    ├── content            the scrolling body
    └── footer?            PageToolbar placement="bottom" (pagination, commit bars)
```

The rule that keeps the two navigation levels legible:
**the header's nav answers "which page"; the toolbar answers "which subset of
this page."** On the repository page that puts Branches/Worktrees in the header
and Active/Deleted in the toolbar.

`PageToolbar` lives here rather than in `branch-management` precisely so
`worktree-management` and `repository-cleanup` can use the same bar — it was
previously copied byte-for-byte between domains to dodge the import rule.

## Settings convention

Every settings section shares one visual language via two components:

### `settings-section.svelte`

A settings-flavoured name for the page convention above: it is a thin wrapper
over `PageHeader` + `PageWell`, so `/settings/*` and every other page share one
implementation.

- Props: `heading`, `subheading?`, `leading?` (icon Stamp snippet), `trailing?`
  (header action, e.g. a reset button), `testId?`, `children` (the rows).

### `settings-field.svelte`

A single row: label + optional help text on the left, an optional control or
read-only value on the right. Built on the Pindoba `Card` (its header is a
Banner).

- Props: `heading`, `subheading?`, `leading?`, `control?` (right-aligned
  snippet) or `value?` (right-aligned read-only mono text), `align?`
  (`'center'` default | `'start'`), plus `as` / `interactive` / `background` /
  `feedback` / `border` / `class` / `testId` for polymorphic, clickable rows.
- Canonical card: `size: sm`, `background: surface.base`, `border: default`
  (raised above the section's `deep` well).

## Conventions

- **Header Stamp:** pages and sections pass their own leading Stamp, sized
  `sm` with a 16px glyph so it flanks the title rather than competing with it
  (`shape="square" size="sm" emphasis="secondary" feedback="neutral" shadow="sm"`).
  The About section is a deliberate **identity exception** — it uses a
  `shape="circle" emphasis="primary" feedback="primary"` stamp to brand the app.
- **Snippet props** passed to `leading`/`trailing`/`control` may need an
  `as Snippet` / `as BannerProps['leading']` cast at the call site, due to
  branding differences between the app's and Pindoba's bundled `svelte` types.

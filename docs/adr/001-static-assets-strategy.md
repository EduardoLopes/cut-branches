# ADR 001: Static Assets Strategy

## Status

Accepted

## Context

The framework-agnostic frontend architecture document specifies that all assets should be organized in `src/assets/` with subdirectories by type. However, SvelteKit has a built-in convention of using a `static/` folder for static assets that are served directly from the root URL without processing.

## Decision

We will use a hybrid approach that respects both the architecture principles and SvelteKit conventions:

1. **Keep `static/` folder** for build-time static assets that need to be served from the root URL
2. **Use `src/assets/` folder** for source assets that are imported and processed by components

## Rationale

1. **Framework Integration**: SvelteKit's `static/` folder is deeply integrated with the build system and deployment process
2. **Asset Types**: Different asset types have different needs:
   - Root-level files (favicon.ico, robots.txt) must be in `static/` to be served correctly
   - Component assets (images, icons) benefit from being in `src/assets/` for bundling and optimization
3. **Build Optimization**: Assets in `src/assets/` can be processed, optimized, and have cache-busting applied

## Implementation

- **`static/`**: favicon.ico, robots.txt, and other root-level static files
- **`src/assets/`**: Component assets organized by type (images, icons, fonts, videos, documents)

## Consequences

- **Positive**: Respects SvelteKit conventions while maintaining architectural organization
- **Positive**: Allows for proper asset optimization and processing
- **Positive**: Clear separation between build assets and source assets
- **Neutral**: Requires understanding of when to use each location
- **Documentation**: Need to document this strategy for team clarity

## Examples

```
static/
├── favicon.ico          # Root-level static files
├── robots.txt
└── manifest.json

src/assets/
├── images/              # Component images
├── icons/               # Component icons
├── fonts/               # Web fonts
└── documents/           # Downloadable files
```

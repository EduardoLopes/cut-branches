# Plan — Migrate Pindoba consumption to Vite path-aliasing

## Context

Today the project consumes 17 Pindoba Svelte UI packages plus `@pindoba/panda-preset` and `@pindoba/panda-buildinfo` via `pnpm` `link:` protocol entries that are toggled in/out by a 330-line shell script (`scripts/manage-pindoba-links.sh`), a wrapper (`scripts/pindoba-link-wrapper.sh`), and Lefthook pre/post-commit hooks. The mechanism is brittle: it mutates `package.json` on every commit, depends on pnpm symlinks (which produce caching/ghost-dependency issues), and requires `pnpm install` after every toggle of `USE_LOCAL_PINDOBA`.

Goal: replace the symlink/override strategy with **Vite path aliasing** (per the strategy doc supplied). Local Pindoba edits in `../pindoba/packages/**/src/**` will hot-reload instantly in this app; production builds (and any environment without `../pindoba`) resolve from `node_modules` against the published `alpha` tag with zero configuration. No more `package.json` mutation, no more shell scripts, no more git hooks for linking.

Scope note: the 17 Svelte component packages are consumed by Vite at runtime, so aliasing works perfectly for them. `@pindoba/panda-preset` and `@pindoba/panda-buildinfo` are loaded by the Panda CLI (Node side, at codegen time), so Vite aliases do not affect them — they will be installed as regular published deps. Working on those two locally is a rare case and falls outside this migration; if needed later, it can be reintroduced as a small targeted override.

## Approach

Switch to a single env-driven branch in `vite.config.js` + `svelte.config.js`. When `USE_LOCAL_PINDOBA=true`, conditionally inject aliases that point each `@pindoba/svelte-*` package to its source `src/lib/index.ts` inside `../pindoba`. When the variable is unset/false (the Netlify / CI / production case), the aliases are not registered and Vite resolves normally from `node_modules`.

### Critical files to modify

- `vite.config.js` — add conditional `resolve.alias` entries for the 17 packages; widen `server.fs.allow` to include `..` (so Vite can serve files from `../pindoba`); adjust `server.watch` so `../pindoba/**` is watched (Vite ignores files outside project root by default).
- `svelte.config.js` — keep existing `kit.alias` map. Do NOT add Pindoba aliases here (kit aliases must resolve to in-repo paths; `..` paths break SvelteKit's tsconfig generation). Type resolution is handled by `tsconfig.json` paths instead (see below).
- `tsconfig.json` — add `compilerOptions.baseUrl` and `compilerOptions.paths` entries for each `@pindoba/svelte-*` package pointing to `../pindoba/packages/**/src/lib/index.ts` and `/*` subpaths. This restores editor + `svelte-check` type resolution when local mode is active. The published `dist/*.d.ts` files are still valid when `USE_LOCAL_PINDOBA` is off, so paths can be present unconditionally; TS just falls back to `node_modules` resolution when files don't exist.
- `package.json` —
  - Replace all 19 `link:../pindoba/...` entries in `dependencies` with the published `alpha` tag (matching the existing `"@pindoba/panda": "alpha"` style).
  - Delete the entire `pnpm.overrides` block.
  - Delete the `pindoba:link`, `pindoba:unlink`, `pindoba:status`, `pindoba:clean` scripts.
  - Simplify `prepare` to: `svelte-kit sync && panda codegen && lefthook install` (drop the wrapper).
- `lefthook.yml` — remove the `clean-pindoba` pre-commit command and the `restore-pindoba` post-commit block.
- `.env.example` — keep `USE_LOCAL_PINDOBA` but rewrite the comments to describe the new aliasing flow (no `pnpm install` required when toggling).
- `scripts/pindoba-link-wrapper.sh`, `scripts/manage-pindoba-links.sh` — delete.
- `CLAUDE.md` — replace the "Pindoba Local Development" section with the new flow (set env var, restart dev server; no install step needed).
- `panda.config.ts` — leave as-is. It already imports `@pindoba/panda-preset` / `@pindoba/panda-buildinfo` from `node_modules`, which is what we want.

### Aliases to register (Vite + tsconfig)

For each of these 17 packages, alias `<pkg>` → `../pindoba/packages/<path>/dist/index.js` and `<pkg>/*` → `../pindoba/packages/<path>/dist/*` (this matches the published package's `exports` field exactly — `"svelte"`/`"default"` → `./dist/index.js`, `"types"` → `./dist/index.d.ts`). UI packages live at `packages/ui/svelte/<name>`; "blocks" packages live at `packages/blocks/svelte/<name>`.

**HMR note:** because aliases point to `dist/`, getting hot reload for a Pindoba source edit requires running the package's watcher (`pnpm --filter @pindoba/svelte-button dev` or the equivalent turbo/workspace command in `../pindoba`) so `svelte-package` rewrites `dist/` on save. Vite then HMRs the consumer app. This is the same trade-off as the current `link:` setup — it never resolved `src/` either — so day-to-day dev workflow is unchanged aside from no longer needing `pnpm install` after toggling.

| Package                             | Path under `../pindoba/packages/` |
| ----------------------------------- | --------------------------------- |
| `@pindoba/svelte-alert`             | `ui/svelte/alert`                 |
| `@pindoba/svelte-badge`             | `ui/svelte/badge`                 |
| `@pindoba/svelte-button`            | `ui/svelte/button`                |
| `@pindoba/svelte-checkbox`          | `ui/svelte/checkbox`              |
| `@pindoba/svelte-dialog`            | `ui/svelte/dialog`                |
| `@pindoba/svelte-group`             | `ui/svelte/group`                 |
| `@pindoba/svelte-loading`           | `ui/svelte/loading`               |
| `@pindoba/svelte-navigation`        | `ui/svelte/navigation`            |
| `@pindoba/svelte-panel`             | `ui/svelte/panel`                 |
| `@pindoba/svelte-popover`           | `ui/svelte/popover`               |
| `@pindoba/svelte-radio`             | `ui/svelte/radio`                 |
| `@pindoba/svelte-select`            | `ui/svelte/select`                |
| `@pindoba/svelte-tabs`              | `ui/svelte/tabs`                  |
| `@pindoba/svelte-text-input`        | `ui/svelte/text-input`            |
| `@pindoba/svelte-pagination`        | `blocks/svelte/pagination`        |
| `@pindoba/svelte-theme-mode-select` | `blocks/svelte/theme-mode-select` |

(Note: the existing dependency list also has `@pindoba/svelte-select` linked but not yet imported in source; keep it in the alias map for parity — it's already a declared dep.)

### `vite.config.js` shape

```js
const isLocalPindoba = process.env.USE_LOCAL_PINDOBA === 'true';

const pindobaPackages = {
	'@pindoba/svelte-alert': 'ui/svelte/alert'
	// ...all 17, see table above
};

const pindobaAliases = isLocalPindoba
	? Object.fromEntries(
			Object.entries(pindobaPackages).map(([pkg, p]) => [
				pkg,
				path.resolve(__dirname, `../pindoba/packages/${p}/dist/index.js`)
			])
		)
	: {};

// resolve.alias merges:
//   '@pindoba/styled-system': path.resolve(__dirname, 'styled-system'),
//   ...pindobaAliases
//
// server.fs.allow:  ['styled-system', '..']      // when isLocalPindoba
// server.watch.ignored: ['**/src-tauri/**']       // (already excludes the rest implicitly; ../pindoba is watched once it's imported)
```

`USE_LOCAL_PINDOBA` is read directly from `process.env`. Vite's standard env loading treats it as a build-time variable when prefixed; here we read it raw because it controls config, not client code. Devs already run with `.env` populated by `vite`/`@sveltejs/kit` — if needed, manually add `dotenv` at the top of `vite.config.js` (small, one-liner). Recommend adding `import 'dotenv/config'` to the top of `vite.config.js` since the current shell wrapper sources `.env` for them.

### `tsconfig.json` shape

```jsonc
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		// ...existing options...
		"baseUrl": ".",
		"paths": {
			"@pindoba/svelte-alert": ["../pindoba/packages/ui/svelte/alert/dist/index.d.ts"],
			"@pindoba/svelte-alert/*": ["../pindoba/packages/ui/svelte/alert/dist/*"]
			// ...one pair per package
		}
	}
}
```

### `panda.config.ts`

Already references `../pindoba/packages/panda-buildinfo/dist/panda.buildinfo.json` directly in `include`. After this change `@pindoba/panda-buildinfo` will be resolved from `node_modules` via the `alpha` tag. The `pandaBuildInfoPath` import will still work. Verify by running `pnpm panda codegen` after the migration.

## Verification

1. **Default (published) mode** — In a fresh checkout with `USE_LOCAL_PINDOBA` unset:
   - `pnpm install` resolves all `@pindoba/*` from the npm registry against the `alpha` tag.
   - `pnpm run build` and `pnpm run dev` succeed; the app renders normally.
   - `grep -r "pindoba" pnpm-lock.yaml | head` shows registry resolutions, no `link:` entries.
2. **Local mode** — With `../pindoba` cloned, built (`dist/` populated), and `USE_LOCAL_PINDOBA=true` in `.env`:
   - `pnpm run dev:svelte` starts. Open `http://localhost:5173`; pages using `@pindoba/svelte-button` etc. render from local `dist/`.
   - In `../pindoba`, run the package watcher (e.g. `pnpm --filter @pindoba/svelte-button dev`). Edit `src/lib/Button.svelte`; the watcher rewrites `dist/`, and Vite HMR picks it up in the consumer within ~1s.
   - `pnpm run check` (svelte-check) passes — confirms tsconfig `paths` resolve correctly to `dist/index.d.ts`.
3. **Toggle smoke test** — Flip `USE_LOCAL_PINDOBA` between `true` and `false`, restart dev server only (no `pnpm install` needed). Both states work.
4. **CI / Netlify analogue** — Run `NODE_ENV=production pnpm run build` without `../pindoba` accessible. Build succeeds.
5. **Tests** — `pnpm test` passes (Vitest uses the same Vite config, so aliases apply consistently).
6. **Lefthook** — Make a no-op commit; verify no pindoba-cleanup hook runs and the commit succeeds without mutating `package.json`.

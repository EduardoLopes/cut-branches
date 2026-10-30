import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, loadEnv } from 'vite';
// https://vitejs.dev/config/

const host = process.env.TAURI_DEV_HOST;

// Build-time metadata surfaced on the About page. Resolved once at config load;
// falls back gracefully when git is unavailable (e.g. a source tarball).
const gitCommit = (() => {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'unknown';
	}
})();
const buildDate = new Date().toISOString();

// Maps each Pindoba package name to its source path inside a sibling Pindoba
// monorepo checkout (../pindoba/packages/<path>). Only used when
// USE_LOCAL_PINDOBA=true; otherwise everything resolves from npm. The local
// svelte-* dist files import their `core-*` and `styles-*` counterparts, so
// those tiers must be aliased too — otherwise a locally-aliased component
// would pull a stale core/styles package from node_modules.
const PINDOBA_PACKAGES = {
	'@pindoba/devtools': 'devtools',
	'@pindoba/core-accordion': 'core/accordion',
	'@pindoba/core-affix': 'core/affix',
	'@pindoba/core-alert': 'core/alert',
	'@pindoba/core-attachment': 'core/attachment',
	'@pindoba/core-avatar': 'core/avatar',
	'@pindoba/core-badge': 'core/badge',
	'@pindoba/core-banner': 'core/banner',
	'@pindoba/core-breadcrumb': 'core/breadcrumb',
	'@pindoba/core-bulk-bar': 'core/bulk-bar',
	'@pindoba/core-button': 'core/button',
	'@pindoba/core-calendar': 'core/calendar',
	'@pindoba/core-capsule': 'core/capsule',
	'@pindoba/core-card': 'core/card',
	'@pindoba/core-carousel': 'core/carousel',
	'@pindoba/core-checkbox': 'core/checkbox',
	'@pindoba/core-choice': 'core/choice',
	'@pindoba/core-color-picker': 'core/color-picker',
	'@pindoba/core-combobox': 'core/combobox',
	'@pindoba/core-dialog': 'core/dialog',
	'@pindoba/core-drag': 'core/drag',
	'@pindoba/core-grid-list': 'core/grid-list',
	'@pindoba/core-group': 'core/group',
	'@pindoba/core-input': 'core/input',
	'@pindoba/core-input-datetime': 'core/input-datetime',
	'@pindoba/core-input-range': 'core/input-range',
	'@pindoba/core-input-upload': 'core/input-upload',
	'@pindoba/core-kbd': 'core/kbd',
	'@pindoba/core-listbox': 'core/listbox',
	'@pindoba/core-loading': 'core/loading',
	'@pindoba/core-menu': 'core/menu',
	'@pindoba/core-navigation': 'core/navigation',
	'@pindoba/core-pagination': 'core/pagination',
	'@pindoba/core-panel': 'core/panel',
	'@pindoba/core-popover': 'core/popover',
	'@pindoba/core-progress': 'core/progress',
	'@pindoba/core-radio': 'core/radio',
	'@pindoba/core-runtime': 'core/runtime',
	'@pindoba/core-segmented-input': 'core/segmented-input',
	'@pindoba/core-select': 'core/select',
	'@pindoba/core-select-native': 'core/select-native',
	'@pindoba/core-stamp': 'core/stamp',
	'@pindoba/core-tab': 'core/tab',
	'@pindoba/core-table': 'core/table',
	'@pindoba/core-timeline': 'core/timeline',
	'@pindoba/core-toast': 'core/toast',
	'@pindoba/core-tooltip': 'core/tooltip',
	'@pindoba/core-tree-view': 'core/tree-view',
	'@pindoba/normalize-props': 'core/normalize-props',
	'@pindoba/svelte-use-store': 'core/svelte-use-store',
	'@pindoba/utils': 'utils',
	'@pindoba/styles-accordion': 'styles/accordion',
	'@pindoba/styles-affix': 'styles/affix',
	'@pindoba/styles-alert': 'styles/alert',
	'@pindoba/styles-attachment': 'styles/attachment',
	'@pindoba/styles-avatar': 'styles/avatar',
	'@pindoba/styles-badge': 'styles/badge',
	'@pindoba/styles-banner': 'styles/banner',
	'@pindoba/styles-breadcrumb': 'styles/breadcrumb',
	'@pindoba/styles-bulk-bar': 'styles/bulk-bar',
	'@pindoba/styles-button': 'styles/button',
	'@pindoba/styles-calendar': 'styles/calendar',
	'@pindoba/styles-capsule': 'styles/capsule',
	'@pindoba/styles-card': 'styles/card',
	'@pindoba/styles-carousel': 'styles/carousel',
	'@pindoba/styles-checkbox': 'styles/checkbox',
	'@pindoba/styles-choice': 'styles/choice',
	'@pindoba/styles-color-picker': 'styles/color-picker',
	'@pindoba/styles-combobox': 'styles/combobox',
	'@pindoba/styles-dialog': 'styles/dialog',
	'@pindoba/styles-grid-list': 'styles/grid-list',
	'@pindoba/styles-group': 'styles/group',
	'@pindoba/styles-input': 'styles/input',
	'@pindoba/styles-input-datetime': 'styles/input-datetime',
	'@pindoba/styles-input-range': 'styles/input-range',
	'@pindoba/styles-input-upload': 'styles/input-upload',
	'@pindoba/styles-kbd': 'styles/kbd',
	'@pindoba/styles-listbox': 'styles/listbox',
	'@pindoba/styles-loading': 'styles/loading',
	'@pindoba/styles-menu': 'styles/menu',
	'@pindoba/styles-navigation': 'styles/navigation',
	'@pindoba/styles-pagination': 'styles/pagination',
	'@pindoba/styles-pan-zoom': 'styles/pan-zoom',
	'@pindoba/styles-panel': 'styles/panel',
	'@pindoba/styles-popover': 'styles/popover',
	'@pindoba/styles-progress': 'styles/progress',
	'@pindoba/styles-radio': 'styles/radio',
	'@pindoba/styles-select': 'styles/select',
	'@pindoba/styles-select-native': 'styles/select-native',
	'@pindoba/styles-stamp': 'styles/stamp',
	'@pindoba/styles-tab': 'styles/tab',
	'@pindoba/styles-table': 'styles/table',
	'@pindoba/styles-theme-mode-select': 'styles/theme-mode-select',
	'@pindoba/styles-timeline': 'styles/timeline',
	'@pindoba/styles-toast': 'styles/toast',
	'@pindoba/styles-tooltip': 'styles/tooltip',
	'@pindoba/styles-topbar': 'styles/topbar',
	'@pindoba/styles-tree-view': 'styles/tree-view',
	'@pindoba/svelte-accordion': 'ui/svelte/accordion',
	'@pindoba/svelte-affix': 'ui/svelte/affix',
	'@pindoba/svelte-alert': 'ui/svelte/alert',
	'@pindoba/svelte-attachment': 'ui/svelte/attachment',
	'@pindoba/svelte-avatar': 'ui/svelte/avatar',
	'@pindoba/svelte-badge': 'ui/svelte/badge',
	'@pindoba/svelte-banner': 'ui/svelte/banner',
	'@pindoba/svelte-breadcrumb': 'ui/svelte/breadcrumb',
	'@pindoba/svelte-bulk-bar': 'ui/svelte/bulk-bar',
	'@pindoba/svelte-button': 'ui/svelte/button',
	'@pindoba/svelte-calendar': 'ui/svelte/calendar',
	'@pindoba/svelte-capsule': 'ui/svelte/capsule',
	'@pindoba/svelte-card': 'ui/svelte/card',
	'@pindoba/svelte-carousel': 'ui/svelte/carousel',
	'@pindoba/svelte-checkbox': 'ui/svelte/checkbox',
	'@pindoba/svelte-choice': 'ui/svelte/choice',
	'@pindoba/svelte-color-picker': 'ui/svelte/color-picker',
	'@pindoba/svelte-combobox': 'ui/svelte/combobox',
	'@pindoba/svelte-dialog': 'ui/svelte/dialog',
	'@pindoba/svelte-grid-list': 'ui/svelte/grid-list',
	'@pindoba/svelte-group': 'ui/svelte/group',
	'@pindoba/svelte-input': 'ui/svelte/input',
	'@pindoba/svelte-input-datetime': 'ui/svelte/input-datetime',
	'@pindoba/svelte-input-range': 'ui/svelte/input-range',
	'@pindoba/svelte-input-upload': 'ui/svelte/input-upload',
	'@pindoba/svelte-kbd': 'ui/svelte/kbd',
	'@pindoba/svelte-listbox': 'ui/svelte/listbox',
	'@pindoba/svelte-loading': 'ui/svelte/loading',
	'@pindoba/svelte-menu': 'ui/svelte/menu',
	'@pindoba/svelte-navigation': 'ui/svelte/navigation',
	'@pindoba/svelte-pagination': 'ui/svelte/pagination',
	'@pindoba/svelte-panel': 'ui/svelte/panel',
	'@pindoba/svelte-popover': 'ui/svelte/popover',
	'@pindoba/svelte-progress': 'ui/svelte/progress',
	'@pindoba/svelte-radio': 'ui/svelte/radio',
	'@pindoba/svelte-select': 'ui/svelte/select',
	'@pindoba/svelte-select-native': 'ui/svelte/select-native',
	'@pindoba/svelte-stamp': 'ui/svelte/stamp',
	'@pindoba/svelte-tab': 'ui/svelte/tab',
	'@pindoba/svelte-table': 'ui/svelte/table',
	'@pindoba/svelte-tooltip': 'ui/svelte/tooltip',
	'@pindoba/svelte-tree-view': 'ui/svelte/tree-view',
	'@pindoba/svelte-theme-mode-select': 'blocks/svelte/theme-mode-select',
	'@pindoba/svelte-toast': 'blocks/svelte/toast'
};

/**
 * Where a Pindoba package's `pkg/<subpath>` imports land: the directory its
 * `exports["./*"]` pattern points into (`dist/src/` for the core tiers and
 * `utils`), falling back to `dist/`. A blanket `dist/` alias sends
 * `@pindoba/utils/sliding-thumb` to a file that doesn't exist.
 */
function pindobaSubpathDir(packageDir) {
	try {
		const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
		const pattern = manifest.exports?.['./*'];
		const target = pattern?.import ?? pattern?.svelte ?? pattern?.default;
		if (typeof target === 'string' && target.includes('*')) {
			return path.resolve(packageDir, target.slice(0, target.indexOf('*'))) + '/';
		}
	} catch {
		// No manifest (sibling checkout incomplete): fall back to dist/.
	}
	return path.join(packageDir, 'dist') + '/';
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode ?? 'development', process.cwd(), '');
	const useLocalPindoba = env.USE_LOCAL_PINDOBA === 'true';

	// Anchored regexes, not string keys: Vite strips a key's trailing slash, so
	// `pkg/` (subpaths) and `pkg` (the entry) would collapse into one prefix
	// match and the bare import would land on the subpath directory.
	const pindobaAliases = useLocalPindoba
		? Object.entries(PINDOBA_PACKAGES).flatMap(([pkg, p]) => {
				const packageDir = path.resolve(__dirname, `../pindoba/packages/${p}`);
				const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				return [
					{ find: new RegExp(`^${escaped}$`), replacement: `${packageDir}/dist/index.js` },
					{
						find: new RegExp(`^${escaped}/(.*)$`),
						replacement: `${pindobaSubpathDir(packageDir)}$1`
					}
				];
			})
		: [];

	const baseAlias = [
		{ find: '@pindoba/styled-system', replacement: path.resolve(__dirname, 'styled-system') },
		...pindobaAliases
	];

	const fsAllow = useLocalPindoba ? ['styled-system', '..'] : ['styled-system'];

	return {
		plugins: [sveltekit()],
		// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
		//
		// 1. prevent vite from obscuring rust errors
		clearScreen: false,
		// tauri expects a fixed port, fail if that port is not available
		server: {
			port: 1420,
			strictPort: true,
			host: host || false,
			hmr: host
				? {
						protocol: 'ws',
						host,
						port: 1421
					}
				: undefined,
			fs: {
				allow: fsAllow
			},
			watch: {
				// 3. tell vite to ignore watching `src-tauri`
				ignored: ['**/src-tauri/**']
			}
		},

		// to make use of `TAURI_DEBUG` and other env variables
		// https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
		envPrefix: ['VITE_', 'TAURI_'],
		build: {
			// Tauri supports es2021
			target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
			// don't minify for debug builds
			minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
			// produce sourcemaps for debug builds
			sourcemap: !!process.env.TAURI_DEBUG
		},
		define: {
			__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
			__APP_COMMIT__: JSON.stringify(gitCommit),
			__BUILD_DATE__: JSON.stringify(buildDate)
		},
		// Pre-bundle the Tauri deps so the browser-mode test server optimizes them
		// up front. Otherwise `vitest related <subset>` discovers them mid-run
		// (notably @tauri-apps/api/webviewWindow via bindings.ts), re-optimizes, and
		// reloads the page — which crashes the run ("Vitest failed to find the
		// runner"). Listed explicitly here to keep the pre-commit test hook stable.
		optimizeDeps: {
			include: [
				'@tauri-apps/api/core',
				'@tauri-apps/api/event',
				'@tauri-apps/api/webviewWindow',
				'@tauri-apps/plugin-dialog',
				'@tanstack/svelte-query'
			]
		},
		resolve: process.env.VITEST
			? {
					conditions: ['browser'],
					alias: baseAlias,
					// The local Pindoba checkout nests its own `svelte` copies. Force a
					// single svelte instance so snippets created here are recognized by
					// Pindoba components' runtime `isSnippet` checks (e.g. the Badge
					// `children` snippet mounted from repository-list).
					dedupe: ['svelte']
				}
			: {
					conditions: ['module', 'browser', 'development|production'],
					alias: baseAlias,
					dedupe: ['svelte']
				},
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}'],
			// Only the generated bindings are exempt; hand-written infrastructure
			// adapters (tauri query/mutation wrappers, promoted query adapters)
			// keep their co-located tests running.
			exclude: ['src/infrastructure/bindings.ts'],
			setupFiles: ['./vitest-setup.js'],
			browser: {
				enabled: true,
				// Headless mode: defaults to true (good for CI)
				// Set HEADLESS=false to run with browser UI for local debugging
				headless: process.env.HEADLESS !== 'false',
				include: ['src/**/*.spec.{js,ts}'],
				provider: playwright(),
				instances: [
					{
						browser: 'chromium'
					}
				],
				screenshotFailures: false
			},
			globals: true,
			coverage: {
				enabled: true,
				provider: 'v8',
				all: true,
				include: ['src/**'],
				exclude: [
					'src/infrastructure/bindings.ts',
					'src/**/*.d.ts',
					'src/**/*.md',
					'src/**/.DS_Store',
					'src/app.html',
					'src/routes/+layout.svelte',
					'src/routes/+layout.ts',
					'src/routes/+page.svelte',
					'src/routes/repos/**/+layout.ts',
					'src/routes/repos/**/+page.svelte',
					'src/routes/settings/+page.svelte'
				]
			},
			alias: {
				'@testing-library/svelte': '@testing-library/svelte/svelte5'
			},
			reporters: ['default', 'html']
		}
	};
});

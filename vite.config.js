import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, loadEnv } from 'vite';
// https://vitejs.dev/config/

const host = process.env.TAURI_DEV_HOST;

// Maps each Pindoba package name to its source path inside a sibling Pindoba
// monorepo checkout (../pindoba/packages/<path>). Only used when
// USE_LOCAL_PINDOBA=true; otherwise everything resolves from npm. The local
// svelte-* dist files import their `core-*` and `styles-*` counterparts, so
// those tiers must be aliased too — otherwise a locally-aliased component
// would pull a stale core/styles package from node_modules.
const PINDOBA_PACKAGES = {
	'@pindoba/core-accordion': 'core/accordion',
	'@pindoba/core-alert': 'core/alert',
	'@pindoba/core-attachment': 'core/attachment',
	'@pindoba/core-avatar': 'core/avatar',
	'@pindoba/core-badge': 'core/badge',
	'@pindoba/core-banner': 'core/banner',
	'@pindoba/core-breadcrumb': 'core/breadcrumb',
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
	'@pindoba/core-group': 'core/group',
	'@pindoba/core-input': 'core/input',
	'@pindoba/core-input-datetime': 'core/input-datetime',
	'@pindoba/core-input-range': 'core/input-range',
	'@pindoba/core-input-upload': 'core/input-upload',
	'@pindoba/core-listbox': 'core/listbox',
	'@pindoba/core-loading': 'core/loading',
	'@pindoba/core-navigation': 'core/navigation',
	'@pindoba/core-pagination': 'core/pagination',
	'@pindoba/core-panel': 'core/panel',
	'@pindoba/core-popover': 'core/popover',
	'@pindoba/core-progress': 'core/progress',
	'@pindoba/core-radio': 'core/radio',
	'@pindoba/core-segmented-input': 'core/segmented-input',
	'@pindoba/core-select': 'core/select',
	'@pindoba/core-stamp': 'core/stamp',
	'@pindoba/core-tab': 'core/tab',
	'@pindoba/core-table': 'core/table',
	'@pindoba/core-timeline': 'core/timeline',
	'@pindoba/core-toast': 'core/toast',
	'@pindoba/core-tooltip': 'core/tooltip',
	'@pindoba/normalize-props': 'core/normalize-props',
	'@pindoba/svelte-use-store': 'core/svelte-use-store',
	'@pindoba/styles-accordion': 'styles/accordion',
	'@pindoba/styles-alert': 'styles/alert',
	'@pindoba/styles-attachment': 'styles/attachment',
	'@pindoba/styles-avatar': 'styles/avatar',
	'@pindoba/styles-badge': 'styles/badge',
	'@pindoba/styles-banner': 'styles/banner',
	'@pindoba/styles-breadcrumb': 'styles/breadcrumb',
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
	'@pindoba/styles-group': 'styles/group',
	'@pindoba/styles-input': 'styles/input',
	'@pindoba/styles-input-datetime': 'styles/input-datetime',
	'@pindoba/styles-input-range': 'styles/input-range',
	'@pindoba/styles-input-upload': 'styles/input-upload',
	'@pindoba/styles-listbox': 'styles/listbox',
	'@pindoba/styles-loading': 'styles/loading',
	'@pindoba/styles-navigation': 'styles/navigation',
	'@pindoba/styles-pagination': 'styles/pagination',
	'@pindoba/styles-pan-zoom': 'styles/pan-zoom',
	'@pindoba/styles-panel': 'styles/panel',
	'@pindoba/styles-popover': 'styles/popover',
	'@pindoba/styles-progress': 'styles/progress',
	'@pindoba/styles-radio': 'styles/radio',
	'@pindoba/styles-select': 'styles/select',
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
	'@pindoba/svelte-alert': 'ui/svelte/alert',
	'@pindoba/svelte-attachment': 'ui/svelte/attachment',
	'@pindoba/svelte-avatar': 'ui/svelte/avatar',
	'@pindoba/svelte-badge': 'ui/svelte/badge',
	'@pindoba/svelte-banner': 'ui/svelte/banner',
	'@pindoba/svelte-breadcrumb': 'ui/svelte/breadcrumb',
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
	'@pindoba/svelte-group': 'ui/svelte/group',
	'@pindoba/svelte-input': 'ui/svelte/input',
	'@pindoba/svelte-input-datetime': 'ui/svelte/input-datetime',
	'@pindoba/svelte-input-range': 'ui/svelte/input-range',
	'@pindoba/svelte-input-upload': 'ui/svelte/input-upload',
	'@pindoba/svelte-listbox': 'ui/svelte/listbox',
	'@pindoba/svelte-loading': 'ui/svelte/loading',
	'@pindoba/svelte-navigation': 'ui/svelte/navigation',
	'@pindoba/svelte-panel': 'ui/svelte/panel',
	'@pindoba/svelte-popover': 'ui/svelte/popover',
	'@pindoba/svelte-progress': 'ui/svelte/progress',
	'@pindoba/svelte-radio': 'ui/svelte/radio',
	'@pindoba/svelte-select': 'ui/svelte/select',
	'@pindoba/svelte-stamp': 'ui/svelte/stamp',
	'@pindoba/svelte-tab': 'ui/svelte/tab',
	'@pindoba/svelte-table': 'ui/svelte/table',
	'@pindoba/svelte-tooltip': 'ui/svelte/tooltip',
	'@pindoba/svelte-pagination': 'blocks/svelte/pagination',
	'@pindoba/svelte-theme-mode-select': 'blocks/svelte/theme-mode-select',
	'@pindoba/svelte-toast': 'blocks/svelte/toast'
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode ?? 'development', process.cwd(), '');
	const useLocalPindoba = env.USE_LOCAL_PINDOBA === 'true';

	const pindobaAliases = useLocalPindoba
		? Object.fromEntries(
				Object.entries(PINDOBA_PACKAGES).flatMap(([pkg, p]) => [
					[`${pkg}/`, path.resolve(__dirname, `../pindoba/packages/${p}/dist/`) + '/'],
					[pkg, path.resolve(__dirname, `../pindoba/packages/${p}/dist/index.js`)]
				])
			)
		: {};

	const baseAlias = {
		'@pindoba/styled-system': path.resolve(__dirname, 'styled-system'),
		...pindobaAliases
	};

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
			__APP_VERSION__: JSON.stringify(process.env.npm_package_version)
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
			exclude: ['src/infrastructure/**'],
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
					'src/infrastructure/**',
					'src/**/*.d.ts',
					'src/**/*.md',
					'src/**/.DS_Store',
					'src/app.html',
					'src/routes/+layout.svelte',
					'src/routes/+layout.ts',
					'src/routes/+page.svelte',
					'src/routes/repos/**/+layout.ts',
					'src/routes/repos/**/+page.svelte'
				]
			},
			alias: {
				'@testing-library/svelte': '@testing-library/svelte/svelte5'
			},
			reporters: ['default', 'html']
		}
	};
});

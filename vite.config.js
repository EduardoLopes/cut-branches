import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, loadEnv } from 'vite';
// https://vitejs.dev/config/

const host = process.env.TAURI_DEV_HOST;

const PINDOBA_PACKAGES = {
	'@pindoba/svelte-alert': 'ui/svelte/alert',
	'@pindoba/svelte-attachment': 'ui/svelte/attachment',
	'@pindoba/svelte-badge': 'ui/svelte/badge',
	'@pindoba/svelte-banner': 'ui/svelte/banner',
	'@pindoba/svelte-button': 'ui/svelte/button',
	'@pindoba/svelte-checkbox': 'ui/svelte/checkbox',
	'@pindoba/svelte-dialog': 'ui/svelte/dialog',
	'@pindoba/svelte-group': 'ui/svelte/group',
	'@pindoba/svelte-input': 'ui/svelte/input',
	'@pindoba/svelte-loading': 'ui/svelte/loading',
	'@pindoba/svelte-navigation': 'ui/svelte/navigation',
	'@pindoba/svelte-panel': 'ui/svelte/panel',
	'@pindoba/svelte-popover': 'ui/svelte/popover',
	'@pindoba/svelte-progress': 'ui/svelte/progress',
	'@pindoba/svelte-radio': 'ui/svelte/radio',
	'@pindoba/svelte-select': 'ui/svelte/select',
	'@pindoba/svelte-stamp': 'ui/svelte/stamp',
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
					alias: baseAlias
				}
			: {
					conditions: ['module', 'browser', 'development|production'],
					alias: baseAlias
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

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

// Local Pindoba development (`USE_LOCAL_PINDOBA=true` in `.env`): the sibling
// checkout's Vite plugin resolves every `@pindoba/*` import through the
// packages' `@pindoba/source` export condition, so pindoba's own sources are
// compiled here and an edit there hot-reloads without building any `dist/`.
// It also dedupes the framework, opens the checkout to the dev server and keeps
// the packages out of pre-bundling. Imported only when present: CI and release
// builds have no checkout and resolve everything from npm.
const PINDOBA_PLUGIN = path.resolve(__dirname, '../pindoba/scripts/vite-pindoba-source.mjs');

export default defineConfig(async ({ mode }) => {
	const env = loadEnv(mode ?? 'development', process.cwd(), '');
	const useLocalPindoba = env.USE_LOCAL_PINDOBA === 'true' && fs.existsSync(PINDOBA_PLUGIN);
	const pindobaSource = useLocalPindoba ? (await import(PINDOBA_PLUGIN)).default : null;

	// The app's own generated Panda output; the plugin leaves this name alone.
	const baseAlias = [
		{ find: '@pindoba/styled-system', replacement: path.resolve(__dirname, 'styled-system') }
	];

	return {
		plugins: [...(pindobaSource ? [pindobaSource()] : []), sveltekit()],
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
				allow: ['styled-system']
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
					alias: baseAlias
				}
			: {
					conditions: ['module', 'browser', 'development|production'],
					alias: baseAlias
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

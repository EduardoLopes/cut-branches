import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
// https://vitejs.dev/config/

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit(), svelteTesting()],
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

	// Disable optimization for all @pindoba packages
	optimizeDeps: {
		exclude: [
			'@pindoba/panda',
			'@pindoba/panda-preset',
			'@pindoba/styles',
			'@pindoba/svelte-alert',
			'@pindoba/svelte-badge',
			'@pindoba/svelte-button',
			'@pindoba/svelte-checkbox',
			'@pindoba/svelte-dialog',
			'@pindoba/svelte-group',
			'@pindoba/svelte-loading',
			'@pindoba/svelte-navigation',
			'@pindoba/svelte-pagination',
			'@pindoba/svelte-popover',
			'@pindoba/svelte-radio',
			'@pindoba/svelte-select',
			'@pindoba/svelte-text-input',
			'@pindoba/svelte-theme-mode-select'
		]
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
	resolve: {
		conditions: mode === 'test' ? ['browser'] : []
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: './vitest-setup.js',
		globals: true,
		coverage: {
			enabled: true,
			provider: 'v8',
			all: true,
			include: ['src/**'],
			exclude: ['src/routes/**', 'src/lib/components/providers.svelte']
		},
		alias: {
			'@testing-library/svelte': '@testing-library/svelte/svelte5'
		},
		reporters: ['default', 'html']
	}
}));

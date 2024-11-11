import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { configDefaults as vitestConfigDefaults } from 'vitest/config';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [sveltekit(), svelteTesting()],
	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	// prevent vite from obscuring rust errors
	clearScreen: false,
	// tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		fs: {
			allow: ['styled-system']
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
	resolve: {
		conditions: mode === 'test' ? ['browser'] : []
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: './vitest-setup.js',
		globals: true,
		coverage: {
			provider: 'v8',
			all: true,
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				...(vitestConfigDefaults.coverage.exclude || []),
				'styled-system',
				'src-tauri',
				'build',
				'.svelte-kit',
				'./*',
				'./src/lib/components/test-wrapper.svelte'
			]
		},
		alias: {
			'@testing-library/svelte': '@testing-library/svelte/svelte5'
		},
		reporters: 'verbose'
	}
}));

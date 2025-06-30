import staticAdapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' with { type: 'json' };

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		version: { name: pkg.version },
		adapter: staticAdapter({
			strict: false
		}),
		alias: {
			'@pindoba/panda': './styled-system/*',
			$domains: './src/domains',
			$ui: './src/ui',
			$utils: './src/utils',
			$services: './src/services',
			$store: './src/store',
			$actions: './src/actions',
			$components: './src/components'
		}
	}
};

export default config;

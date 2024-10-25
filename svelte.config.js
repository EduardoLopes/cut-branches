import staticAdapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// import pkg from './package.json' assert { type: 'json' };

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		version: { name: '0.0.1' },
		adapter: staticAdapter({
			fallback: 'index.html'
		}),
		alias: {
			'@pindoba/panda': './styled-system/*'
		}
	}
};

export default config;

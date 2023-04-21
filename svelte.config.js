import staticAdapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import pkg from './package.json';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [preprocess()],
	kit: {
		version: { name: pkg.version },
		adapter: staticAdapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			static: false
		})
	}
};

export default config;

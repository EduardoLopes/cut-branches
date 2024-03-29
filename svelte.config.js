import staticAdapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
// import pkg from './package.json' assert { type: 'json' };

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [preprocess()],
	kit: {
		version: { name: '0.0.1' },
		adapter: staticAdapter({
			fallback: 'index.html',
		})
	}
};

export default config;

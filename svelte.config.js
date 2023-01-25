import staticAdapter from "@sveltejs/adapter-static";
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [preprocess()],
  kit: {
    adapter: staticAdapter({
		// default options are shown
		pages: 'build',
		assets: 'build',
		fallback: null
	}),
  },
};

export default config;
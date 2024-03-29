import { defineConfig } from 'histoire';
import { HstSvelte } from '@histoire/plugin-svelte';

export default defineConfig({
	setupFile: 'histoire.setup.ts',
	plugins: [HstSvelte()],
	storyIgnored: ['**/node_modules/**', '**/src-tauri/**']
});

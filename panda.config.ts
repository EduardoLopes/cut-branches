import { defineConfig } from '@pandacss/dev';
import { pindobaPreset } from '@pindoba/panda-preset';

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: [
		'node_modules/@pindoba/styles/**/*.{ts,tsx,svelte}',
		'./src/**/*.{ts,tsx,svelte}',
		'./src/lib/Menu.svelte'
	],
	dependencies: ['@pindoba/panda', '@pindoba/styles'],
	importMap: '@pindoba/panda',
	watch: true,
	clean: true,

	// Useful for theme customization
	theme: {
		extend: {}
	},
	presets: ['@pandacss/dev/presets', pindobaPreset],
	jsxFramework: 'svelte',

	// The output directory for your css system
	outdir: 'styled-system'
});

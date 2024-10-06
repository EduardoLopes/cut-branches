import { defineConfig } from '@pandacss/dev';
import { pindobaPreset } from '@pindoba/panda-preset';

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: ['./src/**/*.{ts,tsx,svelte}', 'node_modules/@pindoba/**/*.{ts,tsx,svelte}'],
	dependencies: ['@pindoba/panda', '@pindoba/styles'],
	importMap: '@pindoba/panda',

	// Files to exclude
	exclude: [],

	// Useful for theme customization
	theme: {
		extend: {}
	},
	presets: ['@pandacss/dev/presets', pindobaPreset],

	// The output directory for your css system
	outdir: 'styled-system'
});

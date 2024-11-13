import { defineConfig } from '@pandacss/dev';
import { getRadixColorsTokens, getSemanticTokens, pindobaPreset } from '@pindoba/panda-preset';
import { grass, grassDark, grassA, grassDarkA } from '@radix-ui/colors';

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: [
		'node_modules/@pindoba/**/*.{ts,tsx,svelte}',
		'./src/**/*.{ts,tsx,svelte}',
		'./src/lib/Menu.svelte'
	],
	dependencies: ['@pindoba/panda', '@pindoba/styles'],
	importMap: '@pindoba/panda',
	watch: true,
	clean: true,

	// Useful for theme customization
	theme: {
		extend: {
			tokens: {
				colors: {
					...getRadixColorsTokens({
						colorName: 'grass',
						light: grass,
						dark: grassDark,
						lightAlpha: grassA,
						darkAlpha: grassDarkA
					})
				}
			},
			semanticTokens: {
				colors: {
					contrast: {
						value: {
							base: `#fff`,
							_light: `#000`
						}
					},
					...getSemanticTokens('primary', 'grass')
				}
			}
		}
	},

	presets: ['@pandacss/dev/presets', pindobaPreset],
	jsxFramework: 'svelte',

	// The output directory for your css system
	outdir: 'styled-system'
});

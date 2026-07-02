import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@pandacss/dev';
import { pandaBuildInfoPath } from '@pindoba/panda-buildinfo';
import { preset } from '@pindoba/panda-preset';

// The Panda CLI runs as a standalone Node process and does not auto-load `.env`
// the way Vite does. Read it ourselves so `USE_LOCAL_PINDOBA=true` in `.env`
// affects both the JS aliases (vite.config.js) and the Panda include list.
function readDotenv(file: string): Record<string, string> {
	try {
		const out: Record<string, string> = {};
		for (const line of readFileSync(file, 'utf8').split('\n')) {
			const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
			if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
		}
		return out;
	} catch {
		return {};
	}
}

const dotenv = readDotenv(path.resolve(process.cwd(), '.env'));
const useLocalPindoba = (process.env.USE_LOCAL_PINDOBA ?? dotenv.USE_LOCAL_PINDOBA) === 'true';

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: [
		'./src/**/*.{ts,tsx,svelte}',
		// Only reference the sibling checkout's buildinfo in local mode; in CI /
		// release the `../pindoba` sibling does not exist.
		...(useLocalPindoba ? ['../pindoba/packages/panda-buildinfo/dist/panda.buildinfo.json'] : []),
		pandaBuildInfoPath
	],
	exclude: [''],
	dependencies: ['@pindoba/styled-system'],
	importMap: '@pindoba/styled-system',
	watch: true,
	clean: false,
	globalCss: {
		'*': {
			overscrollBehavior: 'none'
		},
		'body, html': {
			_dark: {
				filter: 'saturate(85%)'
			}
		}
	},

	// Useful for theme customization
	theme: {
		extend: {
			// tokens: {
			// 	colors: {
			// 		...getRadixColorsTokens({
			// 			colorName: 'grass',
			// 			light: grass,
			// 			dark: grassDark,
			// 			lightAlpha: grassA,
			// 			darkAlpha: grassDarkA
			// 		}),
			// 		...getRadixColorsTokens({
			// 			colorName: 'olive',
			// 			light: olive,
			// 			dark: oliveDark,
			// 			lightAlpha: oliveA,
			// 			darkAlpha: oliveDarkA
			// 		})
			// 	}
			// },
			semanticTokens: {
				colors: {
					contrast: {
						value: {
							base: `#fff`,
							_light: `#000`
						}
					}
					// ...getSemanticTokens('primary', 'grass'),
					// ...getSemanticTokens('neutral', 'olive')
				}
			},
			keyframes: {
				// Onboarding animations
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' }
				},
				pulse: {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.8', transform: 'scale(1.05)' }
				},
				bellRing: {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'15%': { transform: 'rotate(14deg)' },
					'30%': { transform: 'rotate(-12deg)' },
					'45%': { transform: 'rotate(10deg)' },
					'60%': { transform: 'rotate(-8deg)' },
					'75%': { transform: 'rotate(4deg)' }
				},
				fadeIn: {
					from: { opacity: '0', transform: 'translateY(20px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				fadeInUp: {
					from: { opacity: '0', transform: 'translateY(15px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				gradientShift: {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' }
				},
				slideUp: {
					from: { opacity: '0', transform: 'translateY(40px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				float1: {
					'0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
					'25%': { transform: 'translate(50px, -50px) rotate(90deg)' },
					'50%': { transform: 'translate(100px, 0) rotate(180deg)' },
					'75%': { transform: 'translate(50px, 50px) rotate(270deg)' }
				},
				float2: {
					'0%, 100%': { transform: 'translate(0, 0) scale(1)' },
					'33%': { transform: 'translate(-80px, -40px) scale(1.1)' },
					'66%': { transform: 'translate(-40px, 60px) scale(0.9)' }
				},
				float3: {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'50%': { transform: 'translate(-60px, -80px)' }
				},
				rotateAngle: {
					'0%': { '--angle': '0deg' },
					'100%': { '--angle': '360deg' }
				}
			}
		}
	},

	presets: ['@pandacss/dev/presets', preset()],
	jsxFramework: 'svelte',

	// The output directory for your css system
	outdir: 'styled-system'
});

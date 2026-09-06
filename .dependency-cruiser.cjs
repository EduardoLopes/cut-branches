/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: 'no-cross-domain-import',
			comment:
				'Per §1.3 / §1.7 of docs/code-design-guide.md, a domain may never import from another domain. ' +
				'Cross-domain composition belongs at the routing/composition layer.',
			severity: 'error',
			from: { path: '^src/domains/([^/]+)/.+' },
			to: {
				path: '^src/domains/([^/]+)/',
				pathNot: '^src/domains/$1/'
			}
		},
		{
			name: 'no-domain-internals-from-outside',
			comment:
				"Routes and composition-root code may import only from a domain's public surface " +
				'(core/composables, core/models, views, types, components). ' +
				'store/, utils/, infrastructure/, and __tests__/ are strictly internal.',
			severity: 'error',
			from: {
				path: '^src/(routes|components|layouts|core|services|utils|ui)/'
			},
			to: {
				path: '^src/domains/[^/]+/(store|utils|infrastructure|__tests__)/'
			}
		},
		{
			name: 'no-circular',
			comment: 'Circular dependencies are an architectural smell.',
			severity: 'error',
			from: {},
			to: { circular: true }
		},
		{
			name: 'no-orphans',
			severity: 'warn',
			comment: 'Orphan modules are a sign of dead code. Either consume them or delete them.',
			from: {
				orphan: true,
				pathNot: [
					'(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
					'\\.d\\.ts$',
					'(^|/)tsconfig\\.json$',
					'(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts|json)$',
					'src/routes/.*\\+(page|layout|server|error)(\\.ts)?$',
					'src/routes/.*\\+(page|layout|server|error)\\.svelte$',
					'src/app\\.(html|d\\.ts)$',
					'src/hooks\\.(client|server)\\.ts$'
				]
			},
			to: {}
		}
	],
	options: {
		doNotFollow: {
			path: ['node_modules', 'styled-system', 'src/infrastructure/bindings.ts']
		},
		exclude: {
			path: [
				'node_modules',
				'styled-system',
				'\\.svelte-kit',
				'src-tauri',
				'src/infrastructure/bindings.ts',
				'\\.test\\.(ts|js)$',
				'\\.spec\\.(ts|js)$',
				'/test-utils\\.ts$',
				'/test-wrapper\\.svelte$'
			]
		},
		tsConfig: {
			fileName: 'tsconfig.json'
		},
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			extensions: ['.ts', '.js', '.svelte', '.svelte.ts'],
			conditionNames: ['import', 'require', 'node', 'default'],
			mainFields: ['svelte', 'module', 'main']
		},
		reporterOptions: {
			text: {
				highlightFocused: true
			}
		}
	}
};

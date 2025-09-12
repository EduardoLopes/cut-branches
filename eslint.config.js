import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import svelte from 'eslint-plugin-svelte';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

/** @type {import('eslint').Linter.Config[]} */
export default ts.config(
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{
		ignores: [
			'**/.svelte-kit',
			'coverage',
			'**/build',
			'src-tauri',
			'.DS_Store',
			'node_modules',
			'/build',
			'/.svelte-kit',
			'/package',
			'.env',
			'.env.*',
			'!.env.example',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock',
			'styled-system',
			'html',
			'src/lib/bindings.ts'
		]
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'import/order': [
				'warn',
				{
					alphabetize: {
						order: 'asc',
						caseInsensitive: true
					},
					'newlines-between': 'never'
				}
			],
			'import/no-unresolved': [
				'error',
				{
					ignore: ['\\$app.*$', '\\$service-worker.*$']
				}
			],
			'import/no-duplicates': 'warn',
			'import/no-named-as-default': 'error',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_'
				}
			]
		},
		plugins: {
			'unused-imports': unusedImports
		},
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: '.'
				}
			}
		}
	},
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	importPlugin.flatConfigs.recommended,
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		rules: {
			'import/no-named-as-default': 'off',
			'import/no-duplicates': 'off'
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		files: ['**/*.ts', '**/*.svelte'],
		rules: {
			'no-undef': 'off'
		}
	}
);

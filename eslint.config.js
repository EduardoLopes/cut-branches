import globals from 'globals';
import pluginJs from '@eslint/js';
import { configs as tsConfigs, parser as tsParser } from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{
		ignores: [
			'**/.svelte-kit',
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
			'styled-system'
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
			'import/order': ['error', { 'newlines-between': 'always' }],
			'import/no-unresolved': [
				'error',
				{
					ignore: ['\\$app.*$', '\\$service-worker.*$']
				}
			],
			'import/no-duplicates': 'error',
			'import/no-named-as-default': 'off'
		},
		settings: {
			'import/parsers': {
				'@typescript-eslint/parser': ['.ts', '.tsx']
			},
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: '.'
				}
			}
		}
	},
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	pluginJs.configs.recommended,
	...tsConfigs.recommended,
	prettier,
	...svelte.configs['flat/recommended'],
	...svelte.configs['flat/prettier'],
	importPlugin.flatConfigs.recommended,
	{
		files: ['**/*.svelte'],
		rules: {
			'import/no-named-as-default': 'off'
		},
		languageOptions: {
			parserOptions: {
				parser: tsParser
			}
		}
	}
];

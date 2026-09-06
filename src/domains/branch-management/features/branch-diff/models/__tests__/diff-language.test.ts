import { describe, expect, it } from 'vitest';
import { getDiffLanguage } from '../diff-language';

describe('getDiffLanguage', () => {
	it('maps common extensions to shiki language ids', () => {
		expect(getDiffLanguage('src/app.ts')).toBe('typescript');
		expect(getDiffLanguage('src/ui/button.svelte')).toBe('svelte');
		expect(getDiffLanguage('src-tauri/src/main.rs')).toBe('rust');
		expect(getDiffLanguage('package.json')).toBe('json');
		expect(getDiffLanguage('README.md')).toBe('markdown');
		expect(getDiffLanguage('scripts/build.sh')).toBe('shellscript');
	});

	it('is case-insensitive on the extension', () => {
		expect(getDiffLanguage('LEGACY.JS')).toBe('javascript');
	});

	it('uses the last extension of the file name', () => {
		expect(getDiffLanguage('component.test.ts')).toBe('typescript');
		expect(getDiffLanguage('archive.tar.gz')).toBeNull();
	});

	it('recognizes well-known extensionless filenames', () => {
		expect(getDiffLanguage('Dockerfile')).toBe('docker');
		expect(getDiffLanguage('services/api/Makefile')).toBe('make');
	});

	it('returns null for unknown extensions and extensionless files', () => {
		expect(getDiffLanguage('binary.xyz123')).toBeNull();
		expect(getDiffLanguage('LICENSE')).toBeNull();
	});

	it('returns null for dotfiles without a real extension', () => {
		expect(getDiffLanguage('.gitignore')).toBeNull();
		expect(getDiffLanguage('.env')).toBeNull();
	});

	it('handles an empty path', () => {
		expect(getDiffLanguage('')).toBeNull();
	});
});

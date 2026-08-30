import { describe, it, expect } from 'vitest';
import { resolveRepositoryPath, resolveRepositorySubPath } from '../repository-route';

// No `$app/paths` mock on purpose: a fake `resolve` that substitutes params
// verbatim would bake in the very assumption under test. These assertions run
// against SvelteKit's real resolver, so they break if it ever starts (or stops)
// encoding parameters on our behalf.

describe('resolveRepositoryPath', () => {
	it('resolves a plain id', () => {
		expect(resolveRepositoryPath('abc123')).toBe('/repos/abc123');
	});

	it('percent-encodes characters that would otherwise break the route', () => {
		expect(resolveRepositoryPath('a#b?c%d/e')).toBe('/repos/a%23b%3Fc%25d%2Fe');
	});

	it('encodes spaces', () => {
		expect(resolveRepositoryPath('my repo')).toBe('/repos/my%20repo');
	});

	it('encodes non-ASCII ids', () => {
		expect(resolveRepositoryPath('reposit\u00f3rio-\u{1F680}')).toBe(
			'/repos/reposit%C3%B3rio-%F0%9F%9A%80'
		);
	});

	it('falls back to the repository index for an empty id', () => {
		expect(resolveRepositoryPath('')).toBe('/repos');
	});
});

describe('resolveRepositorySubPath', () => {
	it.each(['diff', 'history', 'restore', 'worktrees'] as const)('resolves the %s page', (sub) => {
		expect(resolveRepositorySubPath('abc123', sub)).toBe(`/repos/abc123/${sub}`);
	});

	it('percent-encodes the id of a sub-page', () => {
		expect(resolveRepositorySubPath('a#b?c%d/e f', 'diff')).toBe(
			'/repos/a%23b%3Fc%25d%2Fe%20f/diff'
		);
	});

	it('falls back to the repository index for an empty id', () => {
		expect(resolveRepositorySubPath('', 'history')).toBe('/repos');
	});
});

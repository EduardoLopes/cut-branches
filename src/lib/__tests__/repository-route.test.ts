import { describe, it, expect, vi } from 'vitest';
import { resolveRepositoryPath } from '../repository-route';

// Mirrors SvelteKit's `resolve` for a route id: it substitutes params verbatim
// and does no encoding of its own — which is exactly why the helper encodes.
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace(/\[(\w+)\]/g, (_, name) => params[name])
}));

describe('resolveRepositoryPath', () => {
	it('resolves a plain id', () => {
		expect(resolveRepositoryPath('abc123')).toBe('/repos/abc123');
	});

	it('percent-encodes characters that would otherwise break the route', () => {
		expect(resolveRepositoryPath('a#b?c%d/e')).toBe('/repos/a%23b%3Fc%25d%2Fe');
	});
});

import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page';

// Create a mock LoadEvent that satisfies TypeScript requirements
const createMockLoadEvent = (params: { id: string }) => ({
	params,
	fetch: vi.fn(),
	data: null,
	setHeaders: vi.fn(),
	parent: vi.fn(),
	depends: vi.fn(),
	untrack: vi.fn(),
	url: new URL('http://localhost'),
	route: { id: '/repos/[id]/restore' as const },
	tracing: {
		enabled: false,
		root: {
			name: 'mock-root-span',
			id: 'mock-root-id',
			traceId: 'mock-trace-id',
			start: vi.fn(),
			end: vi.fn(),
			setAttribute: vi.fn(),
			addEvent: vi.fn()
		},
		current: {
			name: 'mock-current-span',
			id: 'mock-current-id',
			traceId: 'mock-trace-id',
			start: vi.fn(),
			end: vi.fn(),
			setAttribute: vi.fn(),
			addEvent: vi.fn()
		}
	}
});

describe('+page.ts load function', () => {
	it('should return repoId for valid repository id', async () => {
		const mockLoadEvent = createMockLoadEvent({ id: 'test-repo' });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: 'test-repo'
		});
	});

	it('should return repoId for empty id parameter', async () => {
		const mockLoadEvent = createMockLoadEvent({ id: '' });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: ''
		});
	});

	it('should handle special characters in repo id', async () => {
		const specialId = 'repo-with-special@chars';
		const mockLoadEvent = createMockLoadEvent({ id: specialId });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: specialId
		});
	});

	it('should handle numeric repo ids', async () => {
		const mockLoadEvent = createMockLoadEvent({ id: '12345' });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: '12345'
		});
	});

	it('should handle repo ids with hyphens and underscores', async () => {
		const mockLoadEvent = createMockLoadEvent({ id: 'my-repo_123' });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: 'my-repo_123'
		});
	});

	it('should handle repo ids with dots', async () => {
		const mockLoadEvent = createMockLoadEvent({ id: 'repo.name.with.dots' });
		const result = await load(mockLoadEvent);

		expect(result).toEqual({
			repoId: 'repo.name.with.dots'
		});
	});
});

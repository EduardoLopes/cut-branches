import { redirect } from '@sveltejs/kit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../+page';
import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';

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
	route: { id: '/repos/[id]/restore' as const }
});

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn().mockImplementation((status, location) => {
		const error = new Error(`Redirect to ${location}`);
		// @ts-expect-error - Mock implementation for testing
		error.status = status;
		// @ts-expect-error - Mock implementation for testing
		error.location = location;
		throw error;
	})
}));

vi.mock('$domains/repository-management/store/repository.svelte', () => ({
	getRepositoryStore: vi.fn()
}));

describe('+page.ts load function', () => {
	const mockRepositoryStore = {
		get: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// @ts-expect-error - Mock implementation for testing
		getRepositoryStore.mockReturnValue(mockRepositoryStore);
	});

	it('should return repoId when repository exists in store', async () => {
		// Mock repository exists
		mockRepositoryStore.get.mockReturnValue({ id: 'test-repo', path: '/path/to/repo' });

		const mockLoadEvent = createMockLoadEvent({ id: 'test-repo' });
		const result = await load(mockLoadEvent);

		expect(getRepositoryStore).toHaveBeenCalledWith('test-repo');
		expect(mockRepositoryStore.get).toHaveBeenCalled();
		expect(result).toEqual({
			repoId: 'test-repo'
		});
	});

	it('should redirect to home when repository does not exist', async () => {
		// Mock repository does not exist (returns null/undefined)
		mockRepositoryStore.get.mockReturnValue(null);

		const mockLoadEvent = createMockLoadEvent({ id: 'non-existent-repo' });

		try {
			await load(mockLoadEvent);
			// Should not reach here
			expect.fail('Expected function to throw redirect error');
		} catch {
			expect(getRepositoryStore).toHaveBeenCalledWith('non-existent-repo');
			expect(mockRepositoryStore.get).toHaveBeenCalled();
			expect(redirect).toHaveBeenCalledWith(302, '/');
		}
	});

	it('should redirect to home when repository store is undefined', async () => {
		// @ts-expect-error - Mock implementation for testing
		getRepositoryStore.mockReturnValue(undefined);

		const mockLoadEvent = createMockLoadEvent({ id: 'test-repo' });

		try {
			await load(mockLoadEvent);
			expect.fail('Expected function to throw redirect error');
		} catch {
			expect(getRepositoryStore).toHaveBeenCalledWith('test-repo');
			expect(redirect).toHaveBeenCalledWith(302, '/');
		}
	});

	it('should redirect to home when repository store get() returns undefined', async () => {
		mockRepositoryStore.get.mockReturnValue(undefined);

		const mockLoadEvent = createMockLoadEvent({ id: 'test-repo' });

		try {
			await load(mockLoadEvent);
			expect.fail('Expected function to throw redirect error');
		} catch {
			expect(getRepositoryStore).toHaveBeenCalledWith('test-repo');
			expect(mockRepositoryStore.get).toHaveBeenCalled();
			expect(redirect).toHaveBeenCalledWith(302, '/');
		}
	});

	it('should handle empty id parameter', async () => {
		mockRepositoryStore.get.mockReturnValue(null);

		const mockLoadEvent = createMockLoadEvent({ id: '' });

		try {
			await load(mockLoadEvent);
			expect.fail('Expected function to throw redirect error');
		} catch {
			expect(getRepositoryStore).toHaveBeenCalledWith('');
			expect(redirect).toHaveBeenCalledWith(302, '/');
		}
	});

	it('should handle special characters in repo id', async () => {
		const specialId = 'repo-with-special@chars';
		mockRepositoryStore.get.mockReturnValue({ id: specialId, path: '/path/to/repo' });

		const mockLoadEvent = createMockLoadEvent({ id: specialId });
		const result = await load(mockLoadEvent);

		expect(getRepositoryStore).toHaveBeenCalledWith(specialId);
		expect(result).toEqual({
			repoId: specialId
		});
	});
});

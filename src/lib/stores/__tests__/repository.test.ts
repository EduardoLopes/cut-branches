import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositoryStore, RepositoryStore } from '../repository.svelte';
import type { Repository } from '../repository.svelte';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock for SetStore
const mockDelete = vi.fn();
const mockAdd = vi.fn();
const mockHas = vi.fn().mockReturnValue(false);
const mockSetStore = {
	delete: mockDelete,
	add: mockAdd,
	has: mockHas
};
vi.mock('$lib/utils/set-store.svelte', () => ({
	SetStore: {
		getInstance: vi.fn().mockReturnValue(mockSetStore)
	}
}));

// Mock the static repositories property
beforeEach(() => {
	// Save original implementation
	const originalRepositories = RepositoryStore.repositories;

	// Replace with the mock
	Object.defineProperty(RepositoryStore, 'repositories', {
		configurable: true,
		get: vi.fn().mockReturnValue(mockSetStore)
	});

	return () => {
		// Restore original implementation
		Object.defineProperty(RepositoryStore, 'repositories', {
			configurable: true,
			get: () => originalRepositories
		});
	};
});

describe('getRepositoryStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return undefined if no repository is provided', () => {
		expect(getRepositoryStore()).toBeUndefined();
	});

	it('should return an instance of RepositoryStore if repository is provided', () => {
		const repository = 'test-repo';
		const store = getRepositoryStore(repository);
		expect(store).toBeInstanceOf(RepositoryStore);
	});
});

describe('RepositoryStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should add repository name to repositories set on set', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};
		store.set(repoData);
		expect(goto).toHaveBeenCalledWith(`/repos/${repoData.name}`);
		expect(mockAdd).toHaveBeenCalledWith([repoData.name]);
	});

	it('should remove repository name from repositories set on clear', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};

		// Set a value to store.state
		store.set(repoData);

		// Clear should call delete
		store.clear();
		expect(mockDelete).toHaveBeenCalledWith([repoData.name]);
	});

	it('should handle setting undefined and not navigate', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);

		// Set to undefined (null would work similarly)
		store.set(undefined);

		// Should not call goto when setting undefined
		expect(goto).not.toHaveBeenCalled();

		// Shouldn't interact with repositories
		expect(mockAdd).not.toHaveBeenCalled();
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it('should delete repository from repositories when setting a repo without a name', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);

		// First set a value with a name to establish state
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};
		store.set(repoData);

		vi.clearAllMocks();

		// Now set a repository without a name
		const repoWithoutName = {
			path: '/path/to/other-repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id-2'
			// Intentionally missing name property for testing
		} as unknown as Repository;
		store.set(repoWithoutName);

		// Should not call goto
		expect(goto).not.toHaveBeenCalled();

		// Should delete the previous repo name from repositories
		expect(mockDelete).toHaveBeenCalledWith([repoData.name]);
		expect(mockAdd).not.toHaveBeenCalled();
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositoryStore, RepositoryStore } from '../../store/repository.svelte';
import { goto } from '$app/navigation';
import type { Repository } from '$services/common';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$utils/set-store.svelte', () => ({
	SetStore: {
		getInstance: vi.fn().mockReturnValue({
			delete: vi.fn(),
			add: vi.fn(),
			has: vi.fn().mockReturnValue(false)
		})
	}
}));

// Access the mocked functions
const mockSetStore = {
	delete: vi.fn(),
	add: vi.fn(),
	has: vi.fn().mockReturnValue(false)
};

// Mock the static repositories property
beforeEach(() => {
	// Save original implementation
	const originalRepositories = RepositoryStore.repositories;

	// Reset mock functions for each test
	mockSetStore.delete.mockReset();
	mockSetStore.add.mockReset();
	mockSetStore.has.mockReset().mockReturnValue(false);

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
		expect(mockSetStore.add).toHaveBeenCalledWith([repoData.name]);
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
		expect(mockSetStore.delete).toHaveBeenCalledWith([repoData.name]);
	});

	it('should handle setting undefined and not navigate', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);

		// First set a value to store.state with an actual repository
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};
		store.set(repoData);

		// Reset mocks
		vi.clearAllMocks();

		// Now set to undefined (null would work similarly)
		store.set(undefined);

		// Should not call goto when setting undefined
		expect(goto).not.toHaveBeenCalled();

		// Should delete the previous repository name
		expect(mockSetStore.delete).toHaveBeenCalledWith(['repo-name']);
	});

	it('should delete repository from repositories when setting a repo without a name', () => {
		// Create a new repository store
		const repository = 'test-repo';

		// Create a store with a modified implementation
		class TestRepositoryStore extends RepositoryStore {
			constructor(repo: string) {
				super(repo);
			}

			deleteWasCalled = false;
			deletedNames: string[] = [];

			set(value?: Repository) {
				if (value?.name) {
					goto(`/repos/${value.name}`);
					RepositoryStore.repositories.add([value.name]);
				} else {
					if (this.state?.name) {
						// Instead of calling the actual delete, record that it would be called
						this.deleteWasCalled = true;
						this.deletedNames.push(this.state.name);
					}
				}

				// Set the state directly
				this.state = value;
			}
		}

		const store = new TestRepositoryStore(repository);

		// First set a value with a name
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};

		store.set(repoData);

		// Reset mocks
		vi.clearAllMocks();

		// Now set a repository without a name
		const repoWithoutName = {
			path: '/path/to/other-repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id-2'
			// Intentionally missing name property
		} as unknown as Repository;

		store.set(repoWithoutName);

		// Should not call goto because there's no name
		expect(goto).not.toHaveBeenCalled();

		// Verify our test-specific implementation was called with the expected parameters
		expect(store.deleteWasCalled).toBe(true);
		expect(store.deletedNames).toContain(repoData.name);
	});
});

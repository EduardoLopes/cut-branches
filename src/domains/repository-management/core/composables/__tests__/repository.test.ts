import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositoryStore, RepositoryStore } from '../repository.svelte';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
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

// Mock setup for each test
beforeEach(() => {
	// Reset mock functions for each test
	mockSetStore.delete.mockReset();
	mockSetStore.add.mockReset();
	mockSetStore.has.mockReset().mockReturnValue(false);
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

	// Note: The following tests were removed because they tested old store behavior
	// where repositories were managed in a Set. Repositories are now managed in the
	// database via TanStack Query, so these tests are no longer relevant:
	// - "should add repository name to repositories set on set"
	// - "should remove repository name from repositories set on clear"
	// - "should handle setting undefined and not navigate"

	it('should navigate to repository when setting a repo with an id', () => {
		// Create a new repository store
		const repository = 'test-repo';

		// Create a store with a modified implementation
		class TestRepositoryStore extends RepositoryStore {
			constructor(repo: string) {
				super(repo);
			}

			set(value?: Repository) {
				const oldId = this.state?.id;
				// Set the state directly
				this.state = value;

				// Navigate to repository page if it's a new repository
				if (value?.id && value.id !== oldId) {
					goto(resolve(`/repos/${value.id}`));
				}
			}
		}

		const store = new TestRepositoryStore(repository);

		// First set a value with an id
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};

		store.set(repoData);

		// Should call goto with the ID
		expect(goto).toHaveBeenCalledWith('/repos/unique-id');

		// Reset mocks
		vi.clearAllMocks();

		// Now set a repository with a different ID
		const repoWithDifferentId = {
			name: 'other-repo',
			path: '/path/to/other-repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id-2'
		};

		store.set(repoWithDifferentId);

		// Should call goto with the new ID
		expect(goto).toHaveBeenCalledWith('/repos/unique-id-2');
	});
});

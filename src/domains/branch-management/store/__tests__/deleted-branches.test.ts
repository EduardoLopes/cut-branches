import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	DeletedBranchesStore,
	getDeletedBranchesStore,
	type DeletedBranchesState
} from '../deleted-branches.svelte';
import type { Branch } from '$services/common';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

describe('DeletedBranchesStore', () => {
	const repositoryId = 'test-repo';
	let store: DeletedBranchesStore;

	const mockBranch: Branch = {
		name: 'feature-branch',
		current: false,
		fullyMerged: false,
		lastCommit: {
			sha: 'abc123',
			shortSha: 'abc123',
			date: '2023-01-01T00:00:00Z',
			message: 'Test commit',
			author: 'Test Author',
			email: 'test@example.com'
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset localStorage mock
		localStorageMock.getItem.mockReturnValue(null);
		store = new DeletedBranchesStore(repositoryId);
	});

	describe('constructor', () => {
		it('should initialize with empty branches array', () => {
			const state = store.get();
			expect(state).toEqual({ branches: [] });
		});

		it('should create store with correct key', () => {
			const expectedKey = `store_deleted_branches_${repositoryId}`;
			expect(localStorageMock.getItem).toHaveBeenCalledWith(expectedKey);
		});
	});

	describe('addDeletedBranch', () => {
		it('should add a branch to the deleted branches list', () => {
			store.addDeletedBranch(mockBranch);

			const state = store.get();
			expect(state?.branches).toHaveLength(1);
			expect(state?.branches[0]).toMatchObject({
				...mockBranch,
				isReachable: true
			});
			expect(state?.branches[0].deletedAt).toBeDefined();
		});

		it('should add multiple branches and sort by deletion date', async () => {
			const branch1 = { ...mockBranch, name: 'branch1' };
			const branch2 = { ...mockBranch, name: 'branch2' };

			store.addDeletedBranch(branch1);
			// Add a small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));
			store.addDeletedBranch(branch2);

			const state = store.get();
			expect(state?.branches).toHaveLength(2);
			// Most recently deleted should be first
			expect(state?.branches[0].name).toBe('branch2');
			expect(state?.branches[1].name).toBe('branch1');
		});

		it('should not add branch if state is null', () => {
			// Mock get to return null
			vi.spyOn(store, 'get').mockReturnValue(undefined);

			store.addDeletedBranch(mockBranch);

			// Should not crash and should not call set
			expect(store.get()).toBe(undefined);
		});

		it('should preserve existing branches when adding new one', () => {
			const existingBranch = { ...mockBranch, name: 'existing-branch' };
			store.addDeletedBranch(existingBranch);

			const newBranch = { ...mockBranch, name: 'new-branch' };
			store.addDeletedBranch(newBranch);

			const state = store.get();
			expect(state?.branches).toHaveLength(2);
			expect(state?.branches.some((b) => b.name === 'existing-branch')).toBe(true);
			expect(state?.branches.some((b) => b.name === 'new-branch')).toBe(true);
		});
	});

	describe('removeDeletedBranch', () => {
		beforeEach(() => {
			store.addDeletedBranch(mockBranch);
		});

		it('should remove a branch from the deleted branches list', () => {
			store.removeDeletedBranch(mockBranch.name);

			const state = store.get();
			expect(state?.branches).toHaveLength(0);
		});

		it('should not affect other branches when removing one', () => {
			const anotherBranch = { ...mockBranch, name: 'another-branch' };
			store.addDeletedBranch(anotherBranch);

			store.removeDeletedBranch(mockBranch.name);

			const state = store.get();
			expect(state?.branches).toHaveLength(1);
			expect(state?.branches[0].name).toBe('another-branch');
		});

		it('should not crash when removing non-existent branch', () => {
			store.removeDeletedBranch('non-existent-branch');

			const state = store.get();
			expect(state?.branches).toHaveLength(1);
			expect(state?.branches[0].name).toBe(mockBranch.name);
		});

		it('should not remove branch if state is null', () => {
			vi.spyOn(store, 'get').mockReturnValue(undefined);

			store.removeDeletedBranch(mockBranch.name);

			expect(store.get()).toBe(undefined);
		});
	});

	describe('updateBranchReachability', () => {
		beforeEach(() => {
			store.addDeletedBranch(mockBranch);
		});

		it('should update reachability status of existing branch', () => {
			store.updateBranchReachability(mockBranch.name, false);

			const state = store.get();
			expect(state?.branches[0].isReachable).toBe(false);
		});

		it('should preserve other branch properties when updating reachability', () => {
			store.updateBranchReachability(mockBranch.name, false);

			const state = store.get();
			const updatedBranch = state?.branches[0];
			expect(updatedBranch?.name).toBe(mockBranch.name);
			expect(updatedBranch?.current).toBe(mockBranch.current);
			expect(updatedBranch?.fullyMerged).toBe(mockBranch.fullyMerged);
		});

		it('should not update non-existent branch', () => {
			store.updateBranchReachability('non-existent-branch', false);

			const newState = store.get();
			expect(newState?.branches[0].isReachable).toBe(true); // Original value
		});

		it('should not update branch if state is null', () => {
			vi.spyOn(store, 'get').mockReturnValue(null as unknown as DeletedBranchesState);

			store.updateBranchReachability(mockBranch.name, false);

			expect(store.get()).toBe(null);
		});

		it('should handle multiple branches with same name correctly', () => {
			// Add another branch with same name (edge case)
			store.addDeletedBranch(mockBranch);

			store.updateBranchReachability(mockBranch.name, false);

			const state = store.get();
			// Should update only the first match
			expect(state?.branches.filter((b) => b.isReachable === false)).toHaveLength(1);
		});
	});
});

describe('getDeletedBranchesStore', () => {
	const repositoryId = 'test-repo';

	beforeEach(() => {
		vi.clearAllMocks();
		// Clear the store cache between tests
		const cacheKey = `deleted_branches_${repositoryId}`;
		// accessing private cache for testing
		const globalWithCache = global as typeof global & {
			__deletedBranchesStoreCache?: Record<string, unknown>;
		};
		if (globalWithCache.__deletedBranchesStoreCache) {
			delete globalWithCache.__deletedBranchesStoreCache[cacheKey];
		}
	});

	it('should return DeletedBranchesStore instance for valid repository ID', () => {
		const store = getDeletedBranchesStore(repositoryId);

		expect(store).toBeInstanceOf(DeletedBranchesStore);
	});

	it('should return undefined for undefined repository ID', () => {
		const store = getDeletedBranchesStore(undefined);

		expect(store).toBeUndefined();
	});

	it('should return undefined for null repository ID', () => {
		// @ts-expect-error - Testing invalid input type
		const store = getDeletedBranchesStore(null);

		expect(store).toBeUndefined();
	});

	it('should return undefined for empty string repository ID', () => {
		const store = getDeletedBranchesStore('');

		expect(store).toBeUndefined();
	});

	it('should return same instance for same repository ID (singleton)', () => {
		const store1 = getDeletedBranchesStore(repositoryId);
		const store2 = getDeletedBranchesStore(repositoryId);

		expect(store1).toBe(store2);
	});

	it('should return different instances for different repository IDs', () => {
		const store1 = getDeletedBranchesStore('repo1');
		const store2 = getDeletedBranchesStore('repo2');

		expect(store1).not.toBe(store2);
		expect(store1).toBeInstanceOf(DeletedBranchesStore);
		expect(store2).toBeInstanceOf(DeletedBranchesStore);
	});
});

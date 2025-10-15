import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getLockedBranchesStore } from '../../../store/locked-branches.svelte';
import { getSearchBranchesStore } from '../../../store/search-branches.svelte';
import { getSelectedBranchesStore } from '../../../store/selected-branches.svelte';
import { useBranchSelection } from '../use-branch-selection.svelte';
import type { BranchFilters } from '$lib/bindings';
import type { Repository } from '$services/common';

let currentRepository: Repository | undefined;

// Mock createGetBranchesQuery to return branch data with filter support
vi.mock('../queries/create-get-branches-query', () => ({
	createGetBranchesQuery: (input: () => { repoId: string; filters?: BranchFilters }) => ({
		get data() {
			if (!currentRepository) return { branches: [] };

			// Use branches from current repository to support dynamic updates
			const allBranches = currentRepository.branches;

			const filters = input().filters || {};
			let filteredBranches = [...allBranches];

			// Apply deletionStatus filter
			if (filters.deletionStatus === 'active') {
				filteredBranches = filteredBranches.filter((b) => !b.deletedAt);
			} else if (filters.deletionStatus === 'deleted') {
				filteredBranches = filteredBranches.filter((b) => b.deletedAt);
			}

			// Apply selectionStatus filter
			if (filters.selectionStatus === 'selected') {
				const store = getSelectedBranchesStore('test-repo');
				const selectedNames = Array.from(store?.state || []);
				filteredBranches = filteredBranches.filter((b) => selectedNames.includes(b.name));
			} else if (filters.selectionStatus === 'unselected') {
				const store = getSelectedBranchesStore('test-repo');
				const selectedNames = Array.from(store?.state || []);
				filteredBranches = filteredBranches.filter((b) => !selectedNames.includes(b.name));
			}

			// Apply lockStatus filter
			if (filters.lockStatus === 'locked') {
				filteredBranches = filteredBranches.filter((b) => b.isLocked);
			} else if (filters.lockStatus === 'unlocked') {
				filteredBranches = filteredBranches.filter((b) => !b.isLocked);
			}

			// Apply includeCurrent filter
			if (filters.includeCurrent === false) {
				filteredBranches = filteredBranches.filter((b) => !b.current);
			}

			return {
				branches: filteredBranches
			};
		},
		isLoading: false,
		isError: false
	})
}));

vi.mock('../../../services/createSelectedBranchesQuery', () => ({
	createSelectedBranchesQuery: () => ({
		get data() {
			const store = getSelectedBranchesStore('test-repo');
			return { branches: Array.from(store?.state || []) };
		},
		isLoading: false,
		isError: false
	}),
	createDeletedSelectedBranchesQuery: () => ({
		get data() {
			const store = getSelectedBranchesStore('test-repo');
			return { branches: Array.from(store?.state || []) };
		},
		isLoading: false,
		isError: false
	})
}));

// Mock the mutations to actually update the stores
vi.mock('../../../services/createSelectedBranchesMutations', () => ({
	createUpdateBranchSelectionBatchMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(async ({ branchNames, isSelected }) => {
			const store = getSelectedBranchesStore('test-repo');
			if (isSelected) {
				store?.add(branchNames);
			} else {
				for (const name of branchNames) {
					store?.delete([name]);
				}
			}
			return { status: 'ok' };
		}),
		isPending: false
	}),
	createSetBranchSelectionAllMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(
			async ({ isSelected, deletionStatus, excludeCurrent = true, excludeLocked = true }) => {
				const store = getSelectedBranchesStore('test-repo');

				if (!isSelected) {
					// Deselect all
					store?.clear();
				} else {
					// Select all branches matching the criteria
					if (!currentRepository) return { status: 'ok' };

					const branchesToSelect = currentRepository.branches
						.filter((b) => {
							// Filter by deletion status
							if (deletionStatus === 'deleted' && !b.deletedAt) return false;
							if (deletionStatus === 'active' && b.deletedAt) return false;

							// Filter by current and locked status
							if (excludeCurrent && b.current) return false;
							if (excludeLocked && b.isLocked) return false;

							return true;
						})
						.map((b) => b.name);

					store?.add(branchesToSelect);
				}

				return { status: 'ok' };
			}
		),
		isPending: false
	}),
	createAddDeletedSelectedBranchesMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(async ({ branchNames }) => {
			const store = getSelectedBranchesStore('test-repo');
			store?.add(branchNames);
			return { status: 'ok' };
		}),
		isPending: false
	}),
	createClearDeletedSelectedBranchesMutation: () => ({
		mutate: vi.fn(() => {
			const store = getSelectedBranchesStore('test-repo');
			store?.clear();
		}),
		mutateAsync: vi.fn(async () => {
			const store = getSelectedBranchesStore('test-repo');
			store?.clear();
			return { status: 'ok' };
		}),
		isPending: false
	})
}));

const mockRepo: Repository = {
	name: 'test-repo',
	currentBranch: 'main',
	path: '/path/to/repo',
	branchesCount: 3,
	id: '1',
	branches: [
		{
			name: 'main',
			current: true,
			lastCommit: {
				sha: 'abc123',
				shortSha: 'abc123'.substring(0, 7),
				date: '2023-01-01',
				message: 'Initial commit',
				author: 'John Doe',
				email: 'john@example.com'
			},
			fullyMerged: false,
			deletedAt: null,
			isReachable: true,
			isSelected: false,
			isLocked: false
		},
		{
			name: 'feature-1',
			current: false,
			lastCommit: {
				sha: 'def456',
				shortSha: 'def456'.substring(0, 7),
				date: '2023-01-02',
				message: 'Add feature 1',
				author: 'Jane Doe',
				email: 'jane@example.com'
			},
			fullyMerged: false,
			deletedAt: null,
			isReachable: true,
			isSelected: false,
			isLocked: false
		},
		{
			name: 'feature-2',
			current: false,
			lastCommit: {
				sha: 'ghi789',
				shortSha: 'ghi789'.substring(0, 7),
				date: '2023-01-03',
				message: 'Add feature 2',
				author: 'Jim Doe',
				email: 'jim@example.com'
			},
			fullyMerged: false,
			deletedAt: null,
			isReachable: true,
			isSelected: false,
			isLocked: false
		}
	]
};

describe('useBranchSelection', () => {
	beforeEach(() => {
		const selectedStore = getSelectedBranchesStore('test-repo');
		selectedStore?.clear();
		const lockedStore = getLockedBranchesStore('test-repo');
		lockedStore?.clear();
		currentRepository = mockRepo; // Set default repository
	});

	describe('Computed Values', () => {
		test('calculates selectibleCount correctly excluding current branch', () => {
			currentRepository = mockRepo;
			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			// 2 branches (feature-1, feature-2) that are not current and not locked
			expect(selection.selectibleCount).toBe(2);
		});

		test('calculates selectibleCount as 0 when repository is undefined', () => {
			currentRepository = undefined;
			const selection = useBranchSelection({
				repository: () => undefined,
				deletionStatus: () => 'active' as const
			});

			expect(selection.selectibleCount).toBe(0);
		});

		test('calculates selectedCount correctly', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.selectedCount).toBe(2);
		});

		test('isIndeterminate is true when some but not all branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.isIndeterminate).toBe(true);
			expect(selection.isAllSelected).toBe(false);
		});

		test('isAllSelected is true when all selectible branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.isIndeterminate).toBe(false);
			expect(selection.isAllSelected).toBe(true);
		});

		test('both isIndeterminate and isAllSelected are false when no branches are selected', () => {
			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.isIndeterminate).toBe(false);
			expect(selection.isAllSelected).toBe(false);
		});
	});

	describe('Branch Labels', () => {
		test('returns correct labels', () => {
			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.branchLabel.singular).toBe('branch');
			expect(selection.branchLabel.plural).toBe('branches');
		});
	});

	describe('handleSelectAll', () => {
		test('selects all selectible branches when none are selected', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.clear();

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			await selection.handleSelectAll();

			await vi.waitFor(() => {
				expect(selectedStore?.has('feature-1')).toBe(true);
				expect(selectedStore?.has('feature-2')).toBe(true);
				expect(selectedStore?.has('main')).toBe(false);
			});
		});

		test('deselects all branches when some are selected (indeterminate)', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			await selection.handleSelectAll();

			await vi.waitFor(() => {
				expect(selectedStore?.has('feature-1')).toBe(false);
				expect(selectedStore?.has('feature-2')).toBe(false);
			});
		});

		test('deselects all branches when all are selected', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			await selection.handleSelectAll();

			await vi.waitFor(() => {
				expect(selectedStore?.has('feature-1')).toBe(false);
				expect(selectedStore?.has('feature-2')).toBe(false);
			});
		});

		test('does not select current branch', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.clear();

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			await selection.handleSelectAll();

			await vi.waitFor(() => {
				expect(selectedStore?.has('main')).toBe(false);
			});
		});

		test('does nothing when repository is undefined', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			const initialSize = selectedStore?.state?.size ?? 0;

			const selection = useBranchSelection({
				repository: () => undefined,
				deletionStatus: () => 'active' as const
			});

			await selection.handleSelectAll();

			// Should not change the store
			expect(selectedStore?.state?.size).toBe(initialSize);
		});

		test('uses deleted branch mutations when deletionStatus is deleted', async () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.clear();

			// Create a mock repo with deleted branches
			const mockRepoWithDeletedBranches: Repository = {
				...mockRepo,
				branches: mockRepo.branches.map((b) => ({
					...b,
					deletedAt: b.name !== 'main' ? '2023-01-15' : null
				}))
			};
			currentRepository = mockRepoWithDeletedBranches;

			const selection = useBranchSelection({
				repository: () => mockRepoWithDeletedBranches,
				deletionStatus: () => 'deleted' as const
			});

			await selection.handleSelectAll();

			// Should select deleted branches using the deleted mutations
			await vi.waitFor(() => {
				expect(selectedStore?.has('feature-1')).toBe(true);
				expect(selectedStore?.has('feature-2')).toBe(true);
			});
		});
	});

	describe('Integration - Search and Display', () => {
		test('hasSearchQuery returns true when search is active', () => {
			const search = getSearchBranchesStore('test-repo');
			search?.set('feature');

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.hasSearchQuery).toBe(true);
		});

		test('hasSearchQuery returns false when search is empty', () => {
			const search = getSearchBranchesStore('test-repo');
			search?.clear();

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.hasSearchQuery).toBe(false);
		});

		test('integrates search query with text formatting', () => {
			const search = getSearchBranchesStore('test-repo');
			search?.set('feature');
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.searchInfoText).toBeDefined();
			expect(selection.searchInfoText?.query).toBe('feature');
			expect(selection.searchInfoText?.selectedLabel).toBe('branch');
		});

		test('integrates count with text formatting', () => {
			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.countInfoText).toBe('0 / 2 branches');
		});

		test('searchInfoText returns undefined when no search query', () => {
			const search = getSearchBranchesStore('test-repo');
			search?.clear();

			const selection = useBranchSelection({
				repository: () => mockRepo,
				deletionStatus: () => 'active' as const
			});

			expect(selection.searchInfoText).toBeUndefined();
		});
	});
});

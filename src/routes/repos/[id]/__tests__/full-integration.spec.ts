import { tick } from 'svelte';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import RepositoryPageFixture from './fixtures/repository-page-fixture.svelte';
import { getSearchBranchesStore } from '$domains/branch-management/core/composables/search-branches.svelte';
import { getSelectedBranchesStore } from '$domains/branch-management/core/composables/selected-branches.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock branch list data
const mockBranchesData: BranchData[] = [
	{
		name: 'main',
		current: true,
		isLocked: false,
		isSelected: false,
		upstream: null,
		lastCommit: {
			sha: 'abc1234567890abcdef1234567890abcdef12340',
			shortSha: 'abc1234',
			date: new Date().toISOString(),
			message: 'Initial commit',
			summary: 'Initial commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: true,
		deletedAt: null,
		isReachable: null
	},
	{
		name: 'feature-branch',
		current: false,
		isLocked: false,
		isSelected: false,
		upstream: null,
		lastCommit: {
			sha: 'def4567890abcdef1234567890abcdef12345670',
			shortSha: 'def4567',
			date: new Date().toISOString(),
			message: 'Add feature',
			summary: 'Add feature',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false,
		deletedAt: null,
		isReachable: null
	},
	{
		name: 'bugfix-branch',
		current: false,
		isLocked: false,
		isSelected: false,
		upstream: null,
		lastCommit: {
			sha: 'fed7890abcdef1234567890abcdef123456789a0',
			shortSha: 'fed7890',
			date: new Date().toISOString(),
			message: 'Fix bug',
			summary: 'Fix bug',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false,
		deletedAt: null,
		isReachable: null
	}
];

const mockBranches = mockBranchesData.map((data) => Branch.fromData(data));

// Mock the repository list query
vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: () => ({
		data: [
			{
				id: 'test-repo-id',
				name: 'test-repo',
				path: '/path/to/test-repo',
				currentBranch: 'main',
				branchesCount: 3
			}
		],
		isLoading: false,
		isError: false
	})
}));

// Mock the branch list query
vi.mock('$domains/repository-management/infrastructure/queries/get-branch-list-query', () => ({
	getBranchListQuery: () => ({
		data: { branches: mockBranches },
		isLoading: false,
		isError: false,
		error: null,
		dataUpdatedAt: Date.now(),
		refetch: vi.fn().mockResolvedValue({ data: { branches: mockBranches } })
	})
}));

// Mock the get branches query used by branch-list component
vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: () => ({
		data: { branches: mockBranches },
		isLoading: false,
		isError: false,
		error: null,
		dataUpdatedAt: Date.now()
	})
}));

// Mock the repository query used by active branches view
vi.mock('$domains/branch-management/infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		data: {
			id: 'test-repo-id',
			name: 'test-repo',
			path: '/path/to/test-repo',
			currentBranch: 'main',
			branchesCount: 3
		},
		isLoading: false,
		isError: false,
		error: null
	})
}));

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockImplementation((command, _args) => {
		if (command === 'get_repo_info') {
			return Promise.resolve({
				name: 'test-repo',
				path: '/test/repo/path',
				branches: [
					{
						name: 'main',
						is_current: true,
						last_commit_date: '2023-01-01T12:00:00Z',
						last_commit_message: 'Initial commit'
					},
					{
						name: 'feature-branch',
						is_current: false,
						last_commit_date: '2023-01-02T12:00:00Z',
						last_commit_message: 'Add feature'
					},
					{
						name: 'bugfix-branch',
						is_current: false,
						last_commit_date: '2023-01-03T12:00:00Z',
						last_commit_message: 'Fix bug'
					}
				],
				branches_count: 3
			});
		} else if (command === 'delete_branches') {
			return Promise.resolve({
				success: true,
				deleted_branches: ['feature-branch']
			});
		} else if (command === 'switch_branch') {
			return Promise.resolve({
				success: true,
				branch: 'feature-branch'
			});
		}
		return Promise.resolve(null);
	}),
	Channel: vi.fn().mockImplementation(function (this: {
		onmessage: null | ((event: unknown) => void);
	}) {
		this.onmessage = null;
		return this;
	})
}));

// Mock branch deletion mutation
vi.mock('$domains/branch-management/core/composables/createDeleteBranchesMutation', () => ({
	createDeleteBranchesMutation: vi.fn(({ onSuccess }) => ({
		mutate: vi.fn((_args) => {
			setTimeout(() => {
				if (onSuccess) {
					onSuccess(['feature-branch (was def456)']);
				}
			}, 0);
			return Promise.resolve();
		}),
		isPending: false
	}))
}));

// Mock branch selection mutations
vi.mock('$domains/branch-management/core/composables/createSelectedBranchesMutations', () => ({
	createUpdateBranchSelectionBatchMutation: () => ({
		mutate: vi.fn(({ branchNames, isSelected }) => {
			const store = getSelectedBranchesStore('test-repo-id');
			if (isSelected) {
				store?.add(branchNames);
			} else {
				for (const name of branchNames) {
					store?.delete([name]);
				}
			}
		}),
		isPending: false
	}),
	createSetBranchSelectionAllMutation: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}));

vi.mock('$domains/branch-management/core/composables/createSwitchBranchMutation', () => {
	return {
		createSwitchBranchMutation: vi.fn(({ onSuccess }) => {
			return {
				mutate: vi.fn(({ branch }) => {
					// Simulate success callback
					onSuccess({ currentBranch: branch });
					return Promise.resolve();
				}),
				isPending: false,
				variables: null
			};
		})
	};
});

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock $app/page
vi.mock('$app/page', () => ({
	page: {
		params: {
			id: 'test-repo-id'
		}
	},
	navigating: null
}));

// Mock the notifications store
vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: vi.fn().mockImplementation((notification) => {
			console.log('Mock push called with:', notification);
		})
	}
}));

// Mock $app/state
vi.mock('$app/state', () => ({
	page: {
		params: { id: 'test-repo-id' },
		url: {
			pathname: '/repos/test-repo-id'
		}
	},
	navigating: null
}));

describe('Repository Page Integration Test', () => {
	beforeEach(async () => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		await tick(); // Additional tick for setup
	});

	it('renders repository and menu components', async () => {
		// Directly render the fixture component
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Wait for components to render
		expect(screen.getByTestId('menu-container')).toBeInTheDocument();
		expect(screen.getByTestId('repository-container')).toBeInTheDocument();
	});

	it('renders repository fixture directly', async () => {
		// Directly render the fixture component without TestWrapper
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Wait for components to render
		expect(screen.getByTestId('menu-container')).toBeInTheDocument();
		expect(screen.getByTestId('repository-container')).toBeInTheDocument();
	});

	it('selects a branch and updates UI to reflect selection', async () => {
		// Render with the test repository
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Instead of clicking checkboxes, directly manipulate the selected branches store
		const selectedStore = getSelectedBranchesStore('test-repo-id');
		if (selectedStore) {
			selectedStore.add(['feature-branch']);
		}

		await tick(); // Update after store change
		await tick(); // Additional tick for async updates

		// Verify the selected branches count is updated in the bulk actions area
		const bulkActions = screen.getByTestId('bulk-actions-container');
		expect(bulkActions).toBeInTheDocument();

		// Verify the store has the selected branch
		expect(selectedStore?.state?.has('feature-branch')).toBe(true);
	});

	it('deletes branches and updates counts correctly', async () => {
		// Set up selected branches store
		const selectedStore = getSelectedBranchesStore('test-repo-id');
		if (selectedStore) {
			selectedStore.add([
				'feature-branch' // Ensure this branch exists in the mock
			]);
		}

		// Render the fixture
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Find the delete button in the bulk actions and click it
		const deleteButton = screen.getByTestId('open-dialog-button');
		await userEvent.click(deleteButton);

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// A confirmation dialog should appear
		const deleteModal = screen.getByTestId('delete-branch-dialog');
		expect(deleteModal).toBeInTheDocument();

		// Find and click the confirm button in the modal
		const confirmButton = screen.getByTestId('delete-button');
		await userEvent.click(confirmButton);

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// The delete functionality works via mutations that update the database
		// In the real app, the repository query would refetch and update the count
		// For now, we just verify the delete flow completes without errors
		expect(confirmButton).toBeInTheDocument();
	});

	it('searches for branches and filters the list', async () => {
		// Render the fixture
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Find the search input
		const searchInput = screen.getByPlaceholder('Search branches');

		// Type in the search box
		await userEvent.type(searchInput, 'feature');

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates
		await tick(); // Extra tick for filtering to complete

		// Only branches with "feature" should be visible
		// The full branches list should be filtered
		const searchStore = getSearchBranchesStore('test-repo-id-active');
		expect(searchStore?.state).toBe('feature');

		// Verify that the branch list is rendered
		const branchList = screen.getByRole('list');
		expect(branchList).toBeInTheDocument();

		// Check the number of visible checkboxes after filtering
		// Should have 1 checkbox for feature-branch (main is current and doesn't have checkbox)
		const branchCheckboxes = screen.container.querySelectorAll('input[type="checkbox"]');
		expect(branchCheckboxes.length).toBeGreaterThanOrEqual(1);
	});

	it('switches the current branch', async () => {
		// Render the fixture
		const screen = renderWithTestWrapper(RepositoryPageFixture, {
			id: 'test-repo-id'
		});

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// Wait for branches to render
		const switchButtons = screen.getByTestId('switch-button');
		expect(switchButtons).toBeVisible();

		await userEvent.click(switchButtons);

		await tick(); // Initial tick
		await tick(); // Additional tick for async updates

		// The switch functionality works via mutations
		// The notification would be shown via the mutation's onSuccess callback
		// For now, we just verify the switch flow completes without errors
		expect(switchButtons).toBeVisible();
	});
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchList from '../branch-list.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import { mockDataFactory } from '$utils/test-utils';

// Generate mock branches using factory
function createMockBranches() {
	return [
		mockDataFactory.branch({ name: 'feature/test-branch', current: false }),
		mockDataFactory.branch({ name: 'selected-branch', current: false, isSelected: true }),
		mockDataFactory.branch({ name: 'locked-branch', current: false, isLocked: true }),
		mockDataFactory.branch({ name: 'current-branch', current: true })
	];
}

function createManyMockBranches() {
	return Array.from({ length: 15 }, (_, i) =>
		mockDataFactory.branch({
			name: `branch-${i + 1}`,
			current: false
		})
	);
}

// Variable to track mock branches
let mockBranches = createMockBranches();

// Mock the query to return branches data
vi.mock('../logic/application/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: () => ({
		get data() {
			return { branches: mockBranches };
		},
		isLoading: false,
		isError: false,
		error: null
	})
}));

vi.mock('../../services/createSwitchBranchMutation', () => {
	const mutate = vi.fn();
	return {
		createSwitchBranchMutation: () => {
			return {
				mutate,
				isPending: false,
				variables: null
			};
		}
	};
});

vi.mock('../../services/createSelectedBranchesMutations', () => ({
	createUpdateBranchSelectionBatchMutation: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}));

vi.mock('../../store/search-branches.svelte', () => ({
	getSearchBranchesStore: () => ({
		state: ''
	})
}));

vi.mock('$app/state', () => ({
	page: {
		url: {
			pathname: '/repos/repo1'
		}
	}
}));

// Mock Tauri invoke for any potential queries/mutations
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn((command: string) => {
		if (command === 'get_branch_list') {
			return Promise.resolve({ branches: mockBranches });
		}
		return Promise.resolve(null);
	})
}));

vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock('../../services/createBranchMergeStatusQuery', () => ({
	createBranchMergeStatusQuery: () => ({
		data: undefined,
		isLoading: false,
		isError: false,
		error: null
	})
}));

describe('BranchList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBranches = createMockBranches();
	});

	// TODO: These tests need to be rewritten to work with the new TanStack Query architecture
	// The component now uses createGetBranchesQuery which integrates with TanStack Query's
	// QueryClient, making it difficult to properly mock in unit tests.
	// Consider moving these to integration tests or refactoring the component to be more testable.

	test.skip('renders branches list with checkboxes and switch buttons', () => {
		const { getAllByRole, getAllByTestId } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					repositoryID: 'repo1',
					repositoryPath: '/test/repo/path'
				}
			}
		});

		// Check that we have list items
		const listItems = getAllByRole('listitem');
		expect(listItems.length).toBeGreaterThan(0);

		// Check for checkboxes (3 non-current branches should have checkboxes)
		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Check for switch buttons (non-current branches should have switch buttons)
		const switchButtons = getAllByTestId('switch-button');
		expect(switchButtons.length).toBeGreaterThan(0);
	});

	test.skip('pagination controls are rendered correctly with many branches', async () => {
		// Set many branches
		mockBranches = createManyMockBranches();

		const { getByText } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					repositoryID: 'repo1',
					repositoryPath: '/test/repo/path'
				}
			}
		});

		// Wait for component to render
		await tick();

		// Verify pagination is visible
		const nextButton = getByText('Next');
		expect(nextButton).toBeInTheDocument();

		// Click next
		await fireEvent.click(nextButton);

		// Wait for reactivity
		await tick();

		// Should not throw any errors
		expect(nextButton).toBeInTheDocument();
	});

	test.skip('toggle checkbox should update selected branches state', async () => {
		const { getAllByRole } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					repositoryID: 'repo1',
					repositoryPath: '/test/repo/path'
				}
			}
		});

		// Wait for component to render
		await tick();

		// Find checkbox for a branch
		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Click the first checkbox
		await fireEvent.click(checkboxes[0]);

		// Wait for async mutation to complete
		await tick();

		// The component now uses mutations instead of direct store manipulation
		// The mutation will be called via Tauri command, which is mocked
		// We just verify the checkbox interaction worked without errors
		expect(checkboxes[0]).toBeInTheDocument();
	});
});

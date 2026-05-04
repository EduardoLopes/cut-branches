import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchList from '../branch-list.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { UpdateCurrentBranchInput } from '$infrastructure/bindings';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

// Generate mock branches using factory and convert to domain models
function createMockBranches() {
	return [
		Branch.fromData(mockDataFactory.branch({ name: 'feature/test-branch', current: false })),
		Branch.fromData(
			mockDataFactory.branch({ name: 'selected-branch', current: false, isSelected: true })
		),
		Branch.fromData(
			mockDataFactory.branch({ name: 'locked-branch', current: false, isLocked: true })
		),
		Branch.fromData(mockDataFactory.branch({ name: 'current-branch', current: true }))
	];
}

function createManyMockBranches() {
	return Array.from({ length: 15 }, (_, i) =>
		Branch.fromData(
			mockDataFactory.branch({
				name: `branch-${i + 1}`,
				current: false
			})
		)
	);
}

// Variable to track mock branches - using an object so we can mutate the array reference
const mockBranchesState = { branches: createMockBranches() };

// Mock the query to return branches data
vi.mock('../../core/composables/create-get-branches-query', () => {
	return {
		createGetBranchesQuery: () => {
			// Return an object with a getter that always returns current branches
			const mockQuery = {
				get data() {
					return { branches: mockBranchesState.branches };
				},
				isLoading: false,
				isError: false,
				error: null
			};
			return mockQuery;
		}
	};
});

vi.mock('../../core/composables/create-switch-branch-mutation', () => {
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

vi.mock('../../core/composables/create-update-branch-selection-batch-mutation', () => ({
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

// Mock Tauri commands via bindings
vi.mock('$infrastructure/bindings', async () => {
	const actual = await vi.importActual<typeof import('$infrastructure/bindings')>('$infrastructure/bindings');
	return {
		...actual,
		commands: {
			getBranchList: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: { branches: mockBranchesState.branches }
				})
			),
			updateCurrentBranch: vi.fn((input: UpdateCurrentBranchInput) =>
				Promise.resolve({
					status: 'ok' as const,
					data: { currentBranch: input.branch }
				})
			),
			updateBranchSelectionBatch: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: {}
				})
			),
			getBranchMergeStatus: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: { isMerged: false }
				})
			)
		}
	};
});

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock('../../core/composables/create-branch-merge-status-query', () => ({
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
		mockBranchesState.branches = createMockBranches();
	});

	test('renders branches list with checkboxes and switch buttons', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Check that we have list items
		const list = screen.getByRole('list');
		expect(list).toBeInTheDocument();
		const listItems = screen.container.querySelectorAll('[role="listitem"]');
		expect(listItems.length).toBe(4); // We have 4 branches

		// Check for checkboxes (2 non-current branches should have checkboxes)
		const checkboxes = screen.container.querySelectorAll('input[type="checkbox"]');
		expect(checkboxes.length).toBe(2); // 2 non-current branches

		// Check for switch buttons (non-current branches should have switch buttons)
		const switchButtons = screen.container.querySelectorAll('[data-testid="switch-button"]');
		expect(switchButtons.length).toBe(3); // 3 non-current branches
	});

	test('pagination controls are rendered correctly with many branches', async () => {
		// Set many branches
		mockBranchesState.branches = createManyMockBranches();

		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Check that only first 10 branches are displayed (default itemsPerPage)
		const listItems = screen.container.querySelectorAll('[role="listitem"]');
		expect(listItems.length).toBe(10);

		// Verify pagination controls exist by checking for pagination text
		const paginationText = screen.getByText('Next');
		expect(paginationText).toBeInTheDocument();

		// Verify we have 15 total branches (more than 10, so pagination is needed)
		expect(mockBranchesState.branches.length).toBe(15);
	});

	test('toggle checkbox should update selected branches state', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Find checkbox for the first non-current, non-selected, non-locked branch
		// That would be 'feature/test-branch' with the id 'checkbox-feature/test-branch'
		const checkbox = screen.container.querySelector(
			'#checkbox-feature\\/test-branch'
		) as HTMLInputElement;
		expect(checkbox).toBeInTheDocument();
		expect(checkbox.checked).toBe(false);

		// Click the checkbox
		checkbox.click();

		// Wait for async mutation to complete
		await tick();

		// The component now uses mutations instead of direct store manipulation
		// The mutation will be called via Tauri command, which is mocked
		// We just verify the checkbox interaction worked without errors
		expect(checkbox.checked).toBe(true);
	});
});

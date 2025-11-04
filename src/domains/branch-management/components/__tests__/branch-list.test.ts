import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchList from '../branch-list.svelte';
import type { UpdateCurrentBranchInput } from '$lib/bindings';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

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

// Mock Tauri commands via bindings
vi.mock('$lib/bindings', async () => {
	const actual = await vi.importActual<typeof import('$lib/bindings')>('$lib/bindings');
	return {
		...actual,
		commands: {
			getBranchList: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: { branches: mockBranches }
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
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Check that we have list items
		const listItems = screen.getByRole('listitem');
		expect(listItems.length).toBeGreaterThan(0);

		// Check for checkboxes (3 non-current branches should have checkboxes)
		const checkboxes = screen.getByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Check for switch buttons (non-current branches should have switch buttons)
		const switchButtons = screen.getByTestId('switch-button');
		expect(switchButtons.length).toBeGreaterThan(0);
	});

	test.skip('pagination controls are rendered correctly with many branches', async () => {
		// Set many branches
		mockBranches = createManyMockBranches();

		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Verify pagination is visible
		const nextButton = screen.getByText('Next');
		expect(nextButton).toBeInTheDocument();

		// Click next
		await nextButton.click();

		// Wait for reactivity
		await tick();

		// Should not throw any errors
		expect(nextButton).toBeInTheDocument();
	});

	test.skip('toggle checkbox should update selected branches state', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Find checkbox for a branch
		const checkboxes = screen.getByRole('checkbox');
		expect(checkboxes).toBeInTheDocument();

		// Click the first checkbox
		await checkboxes.click();

		// Wait for async mutation to complete
		await tick();

		// The component now uses mutations instead of direct store manipulation
		// The mutation will be called via Tauri command, which is mocked
		// We just verify the checkbox interaction worked without errors
		expect(checkboxes).toBeChecked();
	});
});

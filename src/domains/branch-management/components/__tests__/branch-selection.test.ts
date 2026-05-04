import { vi, beforeEach, describe, test, expect } from 'vitest';
import { getLockedBranchesStore } from '../../core/composables/locked-branches.svelte';
import { getSearchBranchesStore } from '../../core/composables/search-branches.svelte';
import { getSelectedBranchesStore } from '../../core/composables/selected-branches.svelte';
import BranchSelection from '../branch-selection.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData, BranchFilters } from '$lib/bindings';
import type { Repository } from '$services/common';
import { renderWithTestWrapper } from '$utils/test-utils';

let mockBranchData: Branch[] = [];

// Mock createGetBranchesQuery with filter support
vi.mock('../../core/composables/create-get-branches-query', () => ({
	createGetBranchesQuery: (input: () => { repoId: string; filters?: BranchFilters }) => ({
		get data() {
			const filters = input().filters || {};
			let filteredBranches = [...mockBranchData];

			// Apply deletionStatus filter
			if (filters.deletionStatus === 'active') {
				filteredBranches = filteredBranches.filter((b) => !b.getDeletedAt());
			} else if (filters.deletionStatus === 'deleted') {
				filteredBranches = filteredBranches.filter((b) => b.getDeletedAt());
			}

			// Apply selectionStatus filter
			if (filters.selectionStatus === 'selected') {
				const store = getSelectedBranchesStore('test-repo');
				const selectedNames = Array.from(store?.state || []);
				filteredBranches = filteredBranches.filter((b) => selectedNames.includes(b.getName()));
			} else if (filters.selectionStatus === 'unselected') {
				const store = getSelectedBranchesStore('test-repo');
				const selectedNames = Array.from(store?.state || []);
				filteredBranches = filteredBranches.filter((b) => !selectedNames.includes(b.getName()));
			}

			// Apply lockStatus filter
			if (filters.lockStatus === 'locked') {
				filteredBranches = filteredBranches.filter((b) => b.getIsLocked());
			} else if (filters.lockStatus === 'unlocked') {
				filteredBranches = filteredBranches.filter((b) => !b.getIsLocked());
			}

			// Apply includeCurrent filter
			if (filters.includeCurrent === false) {
				filteredBranches = filteredBranches.filter((b) => !b.isCurrent());
			}

			return {
				branches: filteredBranches
			};
		},
		isLoading: false,
		isError: false
	})
}));

vi.mock('../../core/composables/create-selected-branches-query', () => ({
	createSelectedBranchesQuery: () => ({
		get data() {
			const store = getSelectedBranchesStore('test-repo');
			return { branches: Array.from(store?.state || []) };
		},
		isLoading: false,
		isError: false
	})
}));

vi.mock('../../core/composables/create-deleted-selected-branches-query', () => ({
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
vi.mock('../../core/composables/create-update-branch-selection-batch-mutation', () => ({
	createUpdateBranchSelectionBatchMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		isPending: false
	})
}));

vi.mock('../../core/composables/create-set-branch-selection-all-mutation', () => ({
	createSetBranchSelectionAllMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		isPending: false
	})
}));

const mockBranchesData: BranchData[] = [
	{
		name: 'main',
		current: true,
		lastCommit: {
			sha: 'abc1234567890abcdef1234567890abcdef12340',
			shortSha: 'abc1234',
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
			sha: 'def4567890abcdef1234567890abcdef12345670',
			shortSha: 'def4567',
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
			sha: 'fed7890abcdef1234567890abcdef123456789a0',
			shortSha: 'fed7890',
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
];

const mockBranches = mockBranchesData.map((data) => Branch.fromData(data));

const mockRepo: Repository = {
	name: 'test-repo',
	currentBranch: 'main',
	path: '/path/to/repo',
	branchesCount: 3,
	id: '1',
	branches: mockBranchesData
};

describe('BranchSelection Component', () => {
	const defaultProps = {
		repository: mockRepo,
		branchContext: 'active' as const
	};

	beforeEach(() => {
		// Set default mock branch data
		mockBranchData = mockBranches;

		const search = getSearchBranchesStore(
			`${defaultProps?.repository.name}-${defaultProps.branchContext}`
		);
		search?.clear();
		const selectedStore = getSelectedBranchesStore('test-repo');
		selectedStore?.clear();
		const lockedStore = getLockedBranchesStore('test-repo');
		lockedStore?.clear();
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders select all container when there are selectible branches', () => {
			const { getByTestId } = renderWithTestWrapper(BranchSelection, defaultProps);
			expect(getByTestId('select-all-container')).toBeInTheDocument();
		});

		test('does not render select all container when selectibleCount is 0', () => {
			// Set mock to return only current branch
			mockBranchData = [mockBranches[0]];

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);
			expect(screen.getByTestId('select-all-container')).not.toBeInTheDocument();
		});

		test('renders checkbox', () => {
			const { getByTestId } = renderWithTestWrapper(BranchSelection, defaultProps);
			expect(getByTestId('select-all-checkbox')).toBeInTheDocument();
		});
	});

	describe('Search Query Display', () => {
		test('shows search query info when search is active', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.set('feature');

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			const searchQueryInfo = screen.getByTestId('search-query-info');
			expect(searchQueryInfo).toBeInTheDocument();
			expect(screen.container).toHaveTextContent(/feature/i);
		});

		test('does not show search query info when search is empty', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.clear();

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('search-query-info')).not.toBeInTheDocument();
		});

		test('shows selectible count info when search is empty', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.clear();

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('selectible-count-info')).toBeInTheDocument();
		});

		test('does not show selectible count info when search is active', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.set('feature');

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('selectible-count-info')).not.toBeInTheDocument();
		});
	});

	describe('Text and Pluralization', () => {
		test('displays correct singular form when selectibleCount is 1', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.clear();

			// Set mock to return only main (current) and feature-1 (1 selectible)
			mockBranchData = [mockBranches[0], mockBranches[1]];

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('selectible-count-info')).toHaveTextContent('0 / 1 branch');
		});

		test('displays correct plural form when selectibleCount is greater than 1', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.clear();

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('selectible-count-info')).toHaveTextContent('0 / 2 branches');
		});

		test('shows correct singular form in search results', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.set('feature-1'); // Search that returns only 1 result

			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			// Set mock to return only 2 branches (main + feature-1)
			mockBranchData = [mockBranches[0], mockBranches[1]];

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			const searchQueryInfo = screen.getByTestId('search-query-info');
			expect(searchQueryInfo).toHaveTextContent('branch');
			expect(searchQueryInfo).toHaveTextContent('was found');
		});

		test('shows correct plural form in search results', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.set('feature');

			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);
			expect(screen.getByTestId('search-query-info')).toHaveTextContent('branches');
			expect(screen.getByTestId('search-query-info')).toHaveTextContent('were found');
		});
	});

	describe('Branch Labels', () => {
		test('displays "branch" label', () => {
			const search = getSearchBranchesStore(
				`${defaultProps?.repository.name}-${defaultProps.branchContext}`
			);
			search?.clear();

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			expect(screen.getByTestId('selectible-count-info')).toHaveTextContent('branches');
		});
	});

	describe('Checkbox States', () => {
		test('checkbox is unchecked when no branches are selected', () => {
			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			const checkbox = screen.getByTestId('select-all-checkbox') as unknown as HTMLInputElement;
			expect(checkbox).not.toBeChecked();
		});

		test('checkbox is checked when all branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			const checkbox = screen.getByRole('checkbox', { name: /select all/i });
			expect(checkbox).toBeChecked();
		});

		test('checkbox is indeterminate when some but not all branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			const screen = renderWithTestWrapper(BranchSelection, defaultProps);

			const checkbox = screen.getByRole('checkbox', { name: /select all/i });
			expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
		});
	});
});

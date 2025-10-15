import { render } from '@testing-library/svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import { getLockedBranchesStore } from '../../store/locked-branches.svelte';
import { getSearchBranchesStore } from '../../store/search-branches.svelte';
import { getSelectedBranchesStore } from '../../store/selected-branches.svelte';
import BranchSelection from '../branch-selection.svelte';
import TestWrapper, { testWrapperWithProps } from '$components/test-wrapper.svelte';
import type { Branch, BranchFilters } from '$lib/bindings';
import type { Repository } from '$services/common';

let mockBranchData: Branch[] = [];

// Mock createGetBranchesQuery with filter support
vi.mock('../../logic/application/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: (input: () => { repoId: string; filters?: BranchFilters }) => ({
		get data() {
			const filters = input().filters || {};
			let filteredBranches = [...mockBranchData];

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

vi.mock('../../services/createSelectedBranchesQuery', () => ({
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
vi.mock('../../services/createSelectedBranchesMutations', () => ({
	createAddSelectedBranchesMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(async ({ branchNames }) => {
			const store = getSelectedBranchesStore('test-repo');
			store?.add(branchNames);
			return { status: 'ok' };
		}),
		isPending: false
	}),
	createClearSelectedBranchesMutation: () => ({
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

const mockBranches: Branch[] = [
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
];

const mockRepo: Repository = {
	name: 'test-repo',
	currentBranch: 'main',
	path: '/path/to/repo',
	branchesCount: 3,
	id: '1',
	branches: mockBranches
};

describe('BranchSelection Component', () => {
	const defaultProps = {
		repository: mockRepo
	};

	beforeEach(() => {
		// Set default mock branch data
		mockBranchData = mockBranches;

		const search = getSearchBranchesStore(defaultProps?.repository.name);
		search?.clear();
		const selectedStore = getSelectedBranchesStore('test-repo');
		selectedStore?.clear();
		const lockedStore = getLockedBranchesStore('test-repo');
		lockedStore?.clear();
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders select all container when there are selectible branches', () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});
			expect(getByTestId('select-all-container')).toBeInTheDocument();
		});

		test('does not render select all container when selectibleCount is 0', () => {
			// Set mock to return only current branch
			mockBranchData = [mockBranches[0]];

			const { queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});
			expect(queryByTestId('select-all-container')).not.toBeInTheDocument();
		});

		test('renders checkbox', () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});
			expect(getByTestId('select-all-checkbox')).toBeInTheDocument();
		});
	});

	describe('Search Query Display', () => {
		test('shows search query info when search is active', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.set('feature');

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const searchQueryInfo = getByTestId('search-query-info');
			expect(searchQueryInfo).toBeInTheDocument();
			expect(searchQueryInfo.textContent).toContain('feature');
		});

		test('does not show search query info when search is empty', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.clear();

			const { queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			expect(queryByTestId('search-query-info')).not.toBeInTheDocument();
		});

		test('shows selectible count info when search is empty', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.clear();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			expect(getByTestId('selectible-count-info')).toBeInTheDocument();
		});

		test('does not show selectible count info when search is active', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.set('feature');

			const { queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			expect(queryByTestId('selectible-count-info')).not.toBeInTheDocument();
		});
	});

	describe('Text and Pluralization', () => {
		test('displays correct singular form when selectibleCount is 1', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.clear();

			// Set mock to return only main (current) and feature-1 (1 selectible)
			mockBranchData = [mockBranches[0], mockBranches[1]];

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			expect(getByTestId('selectible-count-info')).toHaveTextContent('0 / 1 branch');
		});

		test('displays correct plural form when selectibleCount is greater than 1', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.clear();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			expect(getByTestId('selectible-count-info')).toHaveTextContent('0 / 2 branches');
		});

		test('shows correct singular form in search results', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.set('feature-1'); // Search that returns only 1 result

			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			// Set mock to return only 2 branches (main + feature-1)
			mockBranchData = [mockBranches[0], mockBranches[1]];

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const searchQueryInfo = getByTestId('search-query-info');
			expect(searchQueryInfo.textContent).toContain('branch');
			expect(searchQueryInfo.textContent).toContain('was found');
		});

		test('shows correct plural form in search results', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.set('feature');

			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const searchQueryInfo = getByTestId('search-query-info');
			expect(searchQueryInfo.textContent).toContain('branches');
			expect(searchQueryInfo.textContent).toContain('were found');
		});
	});

	describe('Branch Labels', () => {
		test('displays "branch" label', () => {
			const search = getSearchBranchesStore(defaultProps?.repository.name);
			search?.clear();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const countInfo = getByTestId('selectible-count-info');
			expect(countInfo.textContent).toContain('branches');
		});
	});

	describe('Checkbox States', () => {
		test('checkbox is unchecked when no branches are selected', () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const checkbox = getByTestId('select-all-checkbox') as HTMLInputElement;
			expect(checkbox.checked).toBe(false);
		});

		test('checkbox is checked when all branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1', 'feature-2']);

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const checkbox = getByTestId('select-all-checkbox') as HTMLInputElement;
			expect(checkbox.checked).toBe(true);
		});

		test('checkbox is indeterminate when some but not all branches are selected', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			selectedStore?.add(['feature-1']);

			const { getByRole } = render(TestWrapper, {
				props: testWrapperWithProps(BranchSelection, defaultProps)
			});

			const checkbox = getByRole('checkbox', { name: /select all/i }) as HTMLInputElement;
			expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
		});
	});
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchListComponent from '../branch-list.svelte';
import type { Branch } from '$lib/services/common';

// Define interface for onSuccess callback options
interface MutationOptions {
	onSuccess?: (branchName: string) => void;
	meta?: { showErrorNotification: boolean };
}

// Setup mocks
vi.mock('$lib/services/createSwitchBranchMutation', () => {
	const mutate = vi.fn();
	return {
		createSwitchBranchMutation: (options: MutationOptions) => {
			if (options && options.onSuccess) {
				// Call onSuccess immediately to test the callback
				setTimeout(() => options.onSuccess?.('test-branch'), 0);
			}
			return {
				mutate,
				isPending: false,
				variables: null
			};
		}
	};
});

vi.mock('$lib/stores/repository.svelte', () => ({
	getRepositoryStore: () => ({
		state: { path: '/test/repo/path' }
	})
}));

vi.mock('$lib/stores/locked-branches.svelte', () => ({
	getLockedBranchesStore: () => ({
		has: (branch: string) => branch === 'locked-branch',
		data: new Set(['locked-branch'])
	})
}));

vi.mock('$lib/stores/selected-branches.svelte', () => {
	const mock = {
		has: (branch: string) => branch === 'selected-branch',
		add: vi.fn(),
		delete: vi.fn(),
		data: new Set(['selected-branch'])
	};
	return {
		getSelectedBranchesStore: () => mock
	};
});

vi.mock('@tanstack/svelte-query', () => ({
	useQueryClient: () => ({
		invalidateQueries: vi.fn()
	})
}));

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Generate mock branches
function createMockBranches(): Branch[] {
	return [
		{
			name: 'feature/test-branch',
			current: false,
			lastCommit: {
				sha: 'abc123',
				shortSha: 'abc123'.substring(0, 7),
				date: '2023-01-01',
				message: 'Commit 1',
				author: 'Author 1',
				email: 'author1@example.com'
			},
			fullyMerged: false
		},
		{
			name: 'selected-branch',
			current: false,
			lastCommit: {
				sha: 'def456',
				shortSha: 'def456'.substring(0, 7),
				date: '2023-01-02',
				message: 'Commit 2',
				author: 'Author 2',
				email: 'author2@example.com'
			},
			fullyMerged: false
		},
		{
			name: 'locked-branch',
			current: false,
			lastCommit: {
				sha: 'ghi789',
				shortSha: 'ghi789'.substring(0, 7),
				date: '2023-01-03',
				message: 'Commit 3',
				author: 'Author 3',
				email: 'author3@example.com'
			},
			fullyMerged: false
		},
		{
			name: 'current-branch',
			current: true,
			lastCommit: {
				sha: 'jkl012',
				shortSha: 'jkl012'.substring(0, 7),
				date: '2023-01-04',
				message: 'Commit 4',
				author: 'Author 4',
				email: 'author4@example.com'
			},
			fullyMerged: false
		}
	];
}

describe('BranchList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('renders branches list with checkboxes and switch buttons', () => {
		const { getAllByRole, getAllByTestId } = render(BranchListComponent, {
			props: {
				branches: createMockBranches(),
				currentBranch: 'current-branch',
				repositoryID: 'repo1'
			}
		});

		// Check that we have list items
		const listItems = getAllByRole('listitem');
		expect(listItems.length).toBeGreaterThan(0);

		// Check for checkboxes
		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Check for switch buttons
		const switchButtons = getAllByTestId('switch-button');
		expect(switchButtons.length).toBeGreaterThan(0);
	});

	test('pagination controls are rendered correctly with many branches', async () => {
		// Create more branches to test pagination
		const manyBranches = Array.from({ length: 15 }, (_, i) => ({
			name: `branch-${i + 1}`,
			current: false,
			lastCommit: {
				sha: `hash-${i + 1}`,
				shortSha: `hash-${i + 1}`.substring(0, 7),
				date: `2023-01-${i + 1}`,
				message: `Commit ${i + 1}`,
				author: 'Test User',
				email: '<test@example.com>'
			},
			fullyMerged: false
		}));

		const { getByText } = render(BranchListComponent, {
			props: {
				branches: manyBranches,
				currentBranch: 'current-branch',
				repositoryID: 'repo1'
			}
		});

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

	test('toggle checkbox should update selected branches state', async () => {
		const { getAllByRole } = render(BranchListComponent, {
			props: {
				branches: createMockBranches(),
				currentBranch: 'current-branch',
				repositoryID: 'repo1'
			}
		});

		// Find checkbox for a branch
		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Get the mock directly from the mock store module
		const { getSelectedBranchesStore } = await import('$lib/stores/selected-branches.svelte');
		// Using type assertion to avoid typescript errors
		const selectedStore = getSelectedBranchesStore();

		// Click the first checkbox
		await fireEvent.click(checkboxes[0]);

		// Verify that the add method was called
		expect(selectedStore?.add).toHaveBeenCalled();
	});
});

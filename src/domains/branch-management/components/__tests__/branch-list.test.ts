import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchList from '../branch-list.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import { mockDataFactory } from '$utils/test-utils';

// Define interface for onSuccess callback options
interface MutationOptions {
	onSuccess?: (branchName: string) => void;
	meta?: { showErrorNotification: boolean };
}

// Setup mocks
vi.mock('../../services/createSwitchBranchMutation', () => {
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

vi.mock('../../repository-management/store/repository.svelte', () => ({
	getRepositoryStore: () => ({
		state: { path: '/test/repo/path' }
	})
}));

vi.mock('../../store/locked-branches.svelte', () => ({
	getLockedBranchesStore: () => ({
		has: (branch: string) => branch === 'locked-branch',
		data: new Set(['locked-branch'])
	})
}));

// Create a mock that can be accessed in tests
const mockSelectedBranchesStore = {
	has: vi.fn((branch: string) => branch === 'selected-branch'),
	add: vi.fn(),
	delete: vi.fn(),
	data: new Set(['selected-branch'])
};

vi.mock('../../store/selected-branches.svelte', () => ({
	getSelectedBranchesStore: () => mockSelectedBranchesStore
}));

// Mock Tauri invoke for any potential queries/mutations
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Generate mock branches using factory
function createMockBranches() {
	return [
		mockDataFactory.branch({ name: 'feature/test-branch', current: false }),
		mockDataFactory.branch({ name: 'selected-branch', current: false }),
		mockDataFactory.branch({ name: 'locked-branch', current: false }),
		mockDataFactory.branch({ name: 'current-branch', current: true })
	];
}

describe('BranchList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('renders branches list with checkboxes and switch buttons', () => {
		const { getAllByRole, getAllByTestId } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					branches: createMockBranches(),
					currentBranch: 'current-branch',
					repositoryID: 'repo1'
				}
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
		// Create more branches to test pagination using factory
		const manyBranches = Array.from({ length: 15 }, (_, i) =>
			mockDataFactory.branch({
				name: `branch-${i + 1}`,
				current: false
			})
		);

		const { getByText } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					branches: manyBranches,
					currentBranch: 'current-branch',
					repositoryID: 'repo1'
				}
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
		const { getAllByRole } = render(TestWrapper, {
			props: {
				component: BranchList,
				props: {
					branches: createMockBranches(),
					currentBranch: 'current-branch',
					repositoryID: 'repo1'
				}
			}
		});

		// Find checkbox for a branch
		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);

		// Click the first checkbox
		await fireEvent.click(checkboxes[0]);

		// Verify that the add method was called on the mocked store
		expect(mockSelectedBranchesStore.add).toHaveBeenCalled();
	});
});

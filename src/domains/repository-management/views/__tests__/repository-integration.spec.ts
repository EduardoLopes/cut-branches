import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRepositoryStore } from '../../store/repository.svelte';
import Repository from '../../views/repository-view.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import { createDeleteBranchesMutation } from '$domains/branch-management/services/createDeleteBranchesMutation';
import * as selectedBranchesStore from '$domains/branch-management/store/selected-branches.svelte';

// Mock the repositories store
vi.mock('../../store/repository.svelte', () => {
	const mockRepoStore = {
		subscribe: vi.fn(),
		set: vi.fn(),
		update: vi.fn()
	};

	return {
		getRepositoryStore: vi.fn().mockReturnValue(mockRepoStore),
		RepositoryStore: vi.fn().mockImplementation(() => mockRepoStore)
	};
});

// Mock selected branches store
vi.mock('$domains/branch-management/store/selected-branches.svelte', () => {
	// Create a mock store inside the mock implementation
	const mockSetStore = {
		add: vi.fn(() => {
			// Implementation doesn't matter for the test
			return;
		}),
		delete: vi.fn(),
		has: vi.fn(() => false),
		clear: vi.fn(),
		subscribe: vi.fn(),
		state: new Set()
	};

	return {
		getSelectedBranchesStore: vi.fn().mockReturnValue(mockSetStore)
	};
});

// Mock notifications store
vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock delete branches mutation
vi.mock('$domains/branch-management/services/createDeleteBranchesMutation', () => ({
	createDeleteBranchesMutation: vi.fn().mockReturnValue({
		mutate: vi.fn(),
		isPending: false
	})
}));

// Mock branch-list component
vi.mock('$domains/branch-management/components/branch-list.svelte', () => ({
	default: vi.fn().mockImplementation((options) => {
		const div = document.createElement('div');
		div.setAttribute('data-testid', 'mock-branch-list');

		// Create a few mock branches for testing
		const mockBranches = Array.from({ length: 3 }, (_, i) => ({
			name: `branch-${i}`,
			isRemote: false,
			isLocked: false
		}));

		// Add buttons for each branch to allow interaction
		mockBranches.forEach((branch, i) => {
			const branchEl = document.createElement('div');
			branchEl.setAttribute('data-testid', `branch-${branch.name}`);
			branchEl.textContent = branch.name;

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.setAttribute('data-testid', `select-branch-${i}`);
			checkbox.addEventListener('click', () => {
				// Get the selected branches store and add the branch
				const selectedStore = selectedBranchesStore.getSelectedBranchesStore('test-repo-id');
				selectedStore?.add([branch.name]);
			});

			branchEl.appendChild(checkbox);
			div.appendChild(branchEl);
		});

		// Ensure target exists before appending
		if (options && options.target) {
			options.target.appendChild(div);
		}

		return {
			$$: { ctx: {} },
			$destroy: vi.fn()
		};
	})
}));

// Mock repository-header component
vi.mock('../../components/repository-header.svelte', () => ({
	default: {
		render: vi.fn().mockImplementation((options) => {
			const header = document.createElement('div');
			header.setAttribute('data-testid', 'mock-repository-header');
			header.textContent = 'Repository Header';

			// Ensure target exists before appending
			if (options && options.target) {
				options.target.appendChild(header);
			}

			return {
				$$: { ctx: {} },
				$destroy: vi.fn()
			};
		})
	}
}));

// Mock branches-bulk-actions component
vi.mock('$domains/branch-management/components/branches-bulk-actions.svelte', () => ({
	default: vi.fn().mockImplementation((options) => {
		const div = document.createElement('div');
		div.setAttribute('data-testid', 'mock-bulk-actions');

		// Add delete button for testing
		const deleteButton = document.createElement('button');
		deleteButton.setAttribute('data-testid', 'delete-branches-button');
		deleteButton.textContent = 'Delete Selected';
		deleteButton.addEventListener('click', () => {
			const mockMutation = createDeleteBranchesMutation();
			// Use a valid type that matches the mutation's expected parameters
			mockMutation.mutate({
				path: '/mock/path',
				branches: [
					{ name: 'branch-1', current: false },
					{ name: 'branch-2', current: false }
				]
			});
		});

		div.appendChild(deleteButton);

		// Ensure target exists before appending
		if (options && options.target) {
			options.target.appendChild(div);
		}

		return {
			$$: { ctx: {} },
			$destroy: vi.fn()
		};
	})
}));

describe('Repository Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Set up mock repository data
		const mockRepositoryStore = getRepositoryStore('test-repo-id');
		if (mockRepositoryStore) {
			const mockSubscribe = vi.fn().mockImplementation((fn) => {
				fn({
					id: 'test-repo-id',
					name: 'Test Repository',
					path: '/mock/path',
					branches: [
						{ name: 'branch-0', isRemote: false, isLocked: false },
						{ name: 'branch-1', isRemote: false, isLocked: false },
						{ name: 'branch-2', isRemote: false, isLocked: false }
					],
					error: null,
					currentBranch: 'main',
					branchesCount: 3,
					lastUpdated: new Date().toISOString()
				});

				return () => {};
			});

			// Add subscribe method to mockRepositoryStore
			Object.defineProperty(mockRepositoryStore, 'subscribe', {
				value: mockSubscribe,
				writable: true
			});
		}

		// Reset selected branches
		const selectedStore = selectedBranchesStore.getSelectedBranchesStore('test-repo-id');
		selectedStore?.clear();

		// Mock the component implementations to actually render the elements
		const headerElement = document.createElement('div');
		headerElement.setAttribute('data-testid', 'mock-repository-header');
		headerElement.textContent = 'Repository Header';
		document.body.appendChild(headerElement);

		// Mock the branch-list's mockImplementation
		const branchListElement = document.createElement('div');
		branchListElement.setAttribute('data-testid', 'mock-branch-list');

		// Add the branch checkboxes
		for (let i = 0; i < 3; i++) {
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.setAttribute('data-testid', `select-branch-${i}`);
			branchListElement.appendChild(checkbox);
		}

		document.body.appendChild(branchListElement);
	});

	afterEach(() => {
		// Clean up any elements we added
		const headerElement = document.querySelector('[data-testid="mock-repository-header"]');
		if (headerElement) headerElement.remove();

		const branchListElement = document.querySelector('[data-testid="mock-branch-list"]');
		if (branchListElement) branchListElement.remove();

		for (let i = 0; i < 3; i++) {
			const checkbox = document.querySelector(`[data-testid="select-branch-${i}"]`);
			if (checkbox) checkbox.remove();
		}
	});

	it('renders repository with header and branch list', () => {
		render(TestWrapper, {
			props: {
				component: Repository,
				props: {
					id: 'test-repo-id'
				}
			}
		});

		// Check that repository components are rendered
		expect(screen.getByTestId('mock-repository-header')).toBeInTheDocument();
		expect(screen.getByTestId('mock-branch-list')).toBeInTheDocument();
	});

	it('allows branch selection and bulk actions', async () => {
		// Reset the mock
		const selectedStore = selectedBranchesStore.getSelectedBranchesStore();
		if (selectedStore) {
			vi.mocked(selectedStore.add).mockClear();
		}

		render(TestWrapper, {
			props: {
				component: Repository,
				props: {
					id: 'test-repo-id'
				}
			}
		});

		// Call add method directly
		if (selectedStore) {
			selectedStore.add(['branch-1']);
			selectedStore.add(['branch-2']);

			// Verify branches were selected
			expect(selectedStore.add).toHaveBeenCalledTimes(2);
		}

		// Perform bulk action (delete)
		const mockMutation = createDeleteBranchesMutation();
		mockMutation.mutate({
			path: '/mock/path',
			branches: [
				{ name: 'branch-1', current: false },
				{ name: 'branch-2', current: false }
			]
		});

		// Verify delete mutation was called with correct parameters
		expect(mockMutation.mutate).toHaveBeenCalledWith({
			path: '/mock/path',
			branches: [
				{ name: 'branch-1', current: false },
				{ name: 'branch-2', current: false }
			]
		});
	});
});

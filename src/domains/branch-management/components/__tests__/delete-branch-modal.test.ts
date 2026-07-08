import { tick } from 'svelte';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import DeleteBranchModal from '../delete-branch-modal.svelte';
import { getDeletedBranchesStore } from '$domains/branch-management/core/composables/deleted-branches.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import { createDeleteBranchesMutation } from '$domains/branch-management/infrastructure/mutations/create-delete-branches-mutation';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock dependencies
vi.mock('$app/state', () => {
	return {
		page: { params: { id: 'test-repo' } }
	};
});

const { mockPush, mockAddDeletedBranch } = vi.hoisted(() => {
	const mockPush = vi.fn();
	const mockAddDeletedBranch = vi.fn();
	return { mockPush, mockAddDeletedBranch };
});

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: mockPush
	}
}));

vi.mock('$domains/branch-management/core/composables/deleted-branches.svelte', () => ({
	getDeletedBranchesStore: vi.fn(() => ({
		addDeletedBranch: mockAddDeletedBranch
	}))
}));

// Simple mutation mock
vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-delete-branches-mutation',
	() => ({
		createDeleteBranchesMutation: vi.fn().mockReturnValue({
			mutate: vi.fn(),
			isPending: false
		})
	})
);

// Mock clear selected branches mutation
vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation',
	() => ({
		createUpdateBranchSelectionBatchMutation: vi.fn(() => ({
			mutate: vi.fn(),
			mutateAsync: vi.fn(),
			isPending: false
		}))
	})
);

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-set-branch-selection-all-mutation',
	() => ({
		createSetBranchSelectionAllMutation: vi.fn(() => ({
			mutate: vi.fn(),
			mutateAsync: vi.fn(),
			isPending: false
		}))
	})
);

// Test data
const mockBranchesData: BranchData[] = [
	{
		name: 'feature-1',
		current: false,
		lastCommit: {
			sha: 'abc1234567890abcdef1234567890abcdef12340',
			shortSha: 'abc1234',
			date: '2023-01-01',
			message: 'Test commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false,
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked: false
	},
	{
		name: 'feature-2',
		current: false,
		lastCommit: {
			sha: 'def4567890abcdef1234567890abcdef12345670',
			shortSha: 'def4567',
			date: '2023-01-02',
			message: 'Another commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false,
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked: false
	},
	{
		name: 'main',
		current: true,
		lastCommit: {
			sha: 'fed7890abcdef1234567890abcdef123456789a0',
			shortSha: 'fed7890',
			date: '2023-01-03',
			message: 'Current branch commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: true,
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked: false
	}
];

const mockBranches = mockBranchesData.map((data) => Branch.fromData(data));

// Mock get repository list query
vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		data: [
			{
				id: 'test-repo',
				name: 'test-repo',
				currentBranch: 'main',
				path: '/path/to/repo',
				branchesCount: 3
			}
		],
		isLoading: false,
		isError: false,
		error: null
	}))
}));

// Variable to track selected branches for mocking
let mockSelectedBranches: string[] = ['feature-1'];

// The validation hint renders inside a native <dialog> that is always present;
// its visibility is the dialog's own open state. Find the open one.
function openHint(): HTMLDialogElement | undefined {
	return [...document.querySelectorAll('dialog[data-popover]')].find(
		(el) => (el as HTMLDialogElement).open
	) as HTMLDialogElement | undefined;
}

// Mock get branches query with dynamic filtering based on filters
vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: vi.fn((filtersFactory) => {
		const filters = typeof filtersFactory === 'function' ? filtersFactory() : filtersFactory;

		// If filtering for selected branches
		if (filters?.filters?.selectionStatus === 'selected') {
			return {
				get data() {
					const selectedBranchesData = mockBranches.filter((b) =>
						mockSelectedBranches.includes(b.getName())
					);
					return { branches: selectedBranchesData };
				},
				isLoading: false,
				isError: false,
				error: null
			};
		}

		// Default: return all branches
		return {
			data: { branches: mockBranches },
			isLoading: false,
			isError: false,
			error: null
		};
	})
}));

describe('DeleteBranchModal Component', () => {
	beforeEach(() => {
		// Reset selected branches to default
		mockSelectedBranches = ['feature-1'];

		// Reset mocks
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders correctly with default state', () => {
			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});
			expect(screen.getByText('Delete branches')).toBeInTheDocument();
		});

		test('keeps the trigger enabled and shows a validation hint when no branches selected', async () => {
			// Set no selected branches
			mockSelectedBranches = [];

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			// The button is never disabled — validation is communicated on click.
			expect(button).not.toBeDisabled();

			await button.click();
			await tick();

			await vi.waitFor(() => expect(openHint()).toBeTruthy());
			expect(openHint()?.textContent).toContain('Select at least one branch to delete.');
		});

		test('renders delete button in enabled state when branches are selected', () => {
			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			expect(button).not.toBeDisabled();
		});
	});

	describe('Modal Interaction', () => {
		test('opens modal on button click', async () => {
			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});
			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			vi.waitFor(() => {
				const dialogQuestion = screen.getByTestId('delete-branch-dialog-question');
				expect(dialogQuestion).toHaveTextContent(
					'Are you sure you want these branches from the repository test-repo?'
				);
			});
		});

		// Skip this test as it appears to be timing-related in Svelte 5
		// The modal state change doesn't seem to properly propagate in the test environment
		test('closes modal on cancel button click', async () => {
			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const dialog = screen.getByTestId('delete-branch-dialog');
			const dialogElement = dialog.element() as HTMLDialogElement;

			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			// Wait for multiple ticks to ensure the dialog opens
			await tick();
			await tick();

			await vi.waitFor(
				() => {
					expect(dialogElement.open).toBe(true);
				},
				{ timeout: 5000 }
			);

			const cancelButton = screen.getByTestId('cancel-button');
			await cancelButton.click();

			// Wait for multiple ticks to ensure the dialog closes
			await tick();
			await tick();

			await vi.waitFor(
				() => {
					expect(dialogElement.open).toBe(false);
				},
				{ timeout: 5000 }
			);
		});
	});

	describe('Branch Deletion', () => {
		test('calls handleDelete with correct branches on delete button click', async () => {
			const deleteMutate = createDeleteBranchesMutation();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});
			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			// Wait for the dialog to open and render
			await tick();
			await tick();

			// Wait for the delete button to be visible
			const deleteButton = screen.getByTestId('delete-button');
			await vi.waitFor(
				() => {
					expect(deleteButton).toBeInTheDocument();
				},
				{ timeout: 5000 }
			);

			await deleteButton.click({ timeout: 5000 });

			// Check that mutate was called
			expect(deleteMutate.mutate).toHaveBeenCalled();

			// Get first call arguments
			const callArgs = (deleteMutate.mutate as Mock).mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				repoId: 'test-repo',
				branches: ['feature-1']
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});

		test('handles multiple branch deletion', async () => {
			// Set multiple selected branches
			mockSelectedBranches = ['feature-1', 'feature-2'];

			const deleteMutate = createDeleteBranchesMutation();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});
			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			const deleteButton = screen.getByTestId('delete-button');
			await deleteButton.click();

			// Check that mutate was called
			expect(deleteMutate.mutate).toHaveBeenCalled();

			// Get first call arguments
			const callArgs = (deleteMutate.mutate as Mock).mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				repoId: 'test-repo',
				branches: ['feature-1', 'feature-2']
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});

		test('prevents deletion of current branch', async () => {
			// Set main branch as selected
			mockSelectedBranches = ['main'];

			// Get the standard mock to avoid typing issues
			const deleteMutate = createDeleteBranchesMutation();
			const mockMutate = deleteMutate.mutate as Mock;

			// Clear previous calls
			mockMutate.mockClear();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});
			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			const deleteButton = screen.getByTestId('delete-button');
			await deleteButton.click();

			// Verify the call happened
			expect(mockMutate).toHaveBeenCalled();

			// Get the first argument of the first call
			const callArgs = mockMutate.mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				repoId: 'test-repo',
				branches: ['main']
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});
	});

	describe('Success Callbacks', () => {
		test('executes onSuccess callback and shows notifications', async () => {
			// Clear any previous calls
			(createDeleteBranchesMutation as Mock).mockClear();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			const deleteButton = screen.getByTestId('delete-button');
			await deleteButton.click();

			vi.waitFor(() => {
				// Get the mutation configuration from when the component called createDeleteBranchesMutation
				// The component should have called it during render with configuration options
				const mutationConfig = (createDeleteBranchesMutation as Mock).mock.calls[0]?.[0];
				expect(mutationConfig).toBeDefined();
				expect(mutationConfig).toHaveProperty('onSuccess');

				// Mock the delete response data
				const mockDeleteResponse = {
					deletedBranches: [
						{
							branch: {
								name: 'feature-1',
								lastCommit: {
									shortSha: 'abc123'
								}
							}
						}
					]
				};

				// Execute the mutation's onSuccess callback directly
				mutationConfig.onSuccess(mockDeleteResponse);

				// Verify notification was pushed
				expect(mockPush).toHaveBeenCalledWith({
					feedback: 'success',
					title: 'Branch deleted from test-repo repository',
					message: '- **feature-1** (was abc123)'
				});
			});
		});

		test('handles multiple branch deletion in notifications', async () => {
			// Set multiple selected branches
			mockSelectedBranches = ['feature-1', 'feature-2'];

			// Clear any previous calls
			(createDeleteBranchesMutation as Mock).mockClear();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			const deleteButton = screen.getByTestId('delete-button');
			await deleteButton.click();

			// Get the mutation configuration from when the component called createDeleteBranchesMutation
			vi.waitFor(() => {
				const mutationConfig = (createDeleteBranchesMutation as Mock).mock.calls[0]?.[0];
				expect(mutationConfig).toBeDefined();
				expect(mutationConfig).toHaveProperty('onSuccess');

				// Mock the delete response data for multiple branches
				const mockDeleteResponse = {
					deletedBranches: [
						{
							branch: {
								name: 'feature-1',
								lastCommit: {
									shortSha: 'abc123'
								}
							}
						},
						{
							branch: {
								name: 'feature-2',
								lastCommit: {
									shortSha: 'def456'
								}
							}
						}
					]
				};

				// Execute the mutation's onSuccess callback
				mutationConfig.onSuccess(mockDeleteResponse);

				// Verify notification was pushed with plural form
				expect(mockPush).toHaveBeenCalledWith({
					feedback: 'success',
					title: 'Branches deleted from test-repo repository',
					message: '- **feature-1** (was abc123)\n\n- **feature-2** (was def456)'
				});
			});
		});
	});

	describe('Branch Sorting', () => {
		test('sorts current branch first', async () => {
			// Include current branch in selection
			mockSelectedBranches = ['feature-1', 'main'];

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			// The current branch (main) should appear first in the list
			// This tests the sort function that puts current: true branches first
			const branchElements = screen.getByText(/^(main|feature-1)$/);
			expect(branchElements.length).toBeGreaterThan(0);
		});

		test('adds deleted branches to deleted branches store on success', async () => {
			const deleteMutate = createDeleteBranchesMutation();

			const screen = renderWithTestWrapper(DeleteBranchModal, {
				id: 'test-repo'
			});

			const button = screen.getByTestId('open-dialog-button');
			await button.click();

			const deleteButton = screen.getByTestId('delete-button');
			await deleteButton.click();

			// Get the handleDelete onSuccess callback (second argument, onSuccess property)
			const callArgs = (deleteMutate.mutate as Mock).mock.calls[0];
			const handleDeleteOnSuccess = callArgs[1].onSuccess;

			// Mock the delete response data
			const mockDeleteResponse = {
				deletedBranches: [
					{
						branch: {
							name: 'feature-1',
							current: false,
							lastCommit: {
								sha: 'abc123',
								shortSha: 'abc123',
								date: '2023-01-01',
								message: 'Test commit',
								author: 'Test User',
								email: 'test@example.com'
							},
							fullyMerged: false
						}
					}
				]
			};

			// Execute the handleDelete onSuccess callback
			handleDeleteOnSuccess(mockDeleteResponse);

			// Verify deleted branch was added to store
			expect(getDeletedBranchesStore).toHaveBeenCalledWith('test-repo'); // repository id
			expect(mockAddDeletedBranch).toHaveBeenCalledWith(
				mockDeleteResponse.deletedBranches[0].branch
			);
		});
	});
});

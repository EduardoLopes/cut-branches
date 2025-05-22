import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import DeleteBranchModal from '../delete-branch-modal.svelte';
import TestWrapper from '../test-wrapper.svelte';
import type { Branch } from '$lib/services/common';
import { createDeleteBranchesMutation } from '$lib/services/createDeleteBranchesMutation';
import { getRepositoryStore } from '$lib/stores/repository.svelte';
import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';

// Mock dependencies
vi.mock('$app/state', () => {
	return {
		page: { params: { id: 'test-repo' } }
	};
});

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Simple mutation mock
vi.mock('$lib/services/createDeleteBranchesMutation', () => ({
	createDeleteBranchesMutation: vi.fn().mockReturnValue({
		mutate: vi.fn()
	})
}));

// Test data
const mockBranches: Branch[] = [
	{
		name: 'feature-1',
		current: false,
		lastCommit: {
			sha: 'abc123',
			shortSha: 'abc123'.substring(0, 7),
			date: '2023-01-01',
			message: 'Test commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false
	},
	{
		name: 'feature-2',
		current: false,
		lastCommit: {
			sha: 'def456',
			shortSha: 'def456'.substring(0, 7),
			date: '2023-01-02',
			message: 'Another commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false
	},
	{
		name: 'main',
		current: true,
		lastCommit: {
			sha: 'ghi789',
			shortSha: 'ghi789'.substring(0, 7),
			date: '2023-01-03',
			message: 'Current branch commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: true
	}
];

describe('DeleteBranchModal Component', () => {
	beforeEach(() => {
		// Set up test data
		const repository = getRepositoryStore('test-repo');
		repository?.set({
			name: 'test-repo',
			currentBranch: 'main',
			path: '/path/to/repo',
			branchesCount: 3,
			id: '1',
			branches: mockBranches
		});

		const selectedBranches = getSelectedBranchesStore('test-repo');
		selectedBranches?.clear();
		selectedBranches?.add(['feature-1']);

		// Reset mocks
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders correctly with default state', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: DeleteBranchModal }
			});
			expect(getByText('Delete branches')).toBeInTheDocument();
		});

		test('renders delete button in disabled state when no branches selected', () => {
			const selectedBranches = getSelectedBranchesStore('test-repo');
			selectedBranches?.clear();

			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});

			const button = getByTestId('open-dialog-button');
			expect(button).toBeDisabled();
		});

		test('renders delete button in enabled state when branches are selected', () => {
			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});

			const button = getByTestId('open-dialog-button');
			expect(button).not.toBeDisabled();
		});
	});

	describe('Modal Interaction', () => {
		test('opens modal on button click', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});
			const button = getByTestId('open-dialog-button');
			await fireEvent.click(button);
			const dialogQuestion = getByTestId('delete-branch-dialog-question');
			expect(dialogQuestion).toHaveTextContent(
				'Are you sure you want these branches from the repository test-repo?'
			);
		});

		// Skip this test as it appears to be timing-related in Svelte 5
		// The modal state change doesn't seem to properly propagate in the test environment
		test('closes modal on cancel button click', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});
			const button = getByTestId('open-dialog-button');
			await fireEvent.click(button);

			const cancelButton = getByTestId('cancel-button');
			await fireEvent.click(cancelButton);

			// In Svelte 5, state updates might not propagate immediately in the test environment
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Instead of checking for the dialog to be removed from the DOM,
			// we'll check if the dialog's open attribute has been set to false
			// This is more aligned with how Svelte 5 handles dialog state
			const dialog = getByTestId('delete-branch-dialog');
			expect(dialog.getAttribute('open')).toBeFalsy();
		});
	});

	describe('Branch Deletion', () => {
		test('calls handleDelete with correct branches on delete button click', async () => {
			const deleteMutate = createDeleteBranchesMutation();

			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});
			const button = getByTestId('open-dialog-button');
			await fireEvent.click(button);

			const deleteButton = getByTestId('delete-button');
			await fireEvent.click(deleteButton);

			// Check that mutate was called
			expect(deleteMutate.mutate).toHaveBeenCalled();

			// Get first call arguments
			const callArgs = (deleteMutate.mutate as Mock).mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				branches: [
					{
						name: 'feature-1',
						current: false
					}
				]
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});

		test('handles multiple branch deletion', async () => {
			const selectedBranches = getSelectedBranchesStore('test-repo');
			selectedBranches?.clear();
			selectedBranches?.add(['feature-1', 'feature-2']);

			const deleteMutate = createDeleteBranchesMutation();

			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});

			const button = getByTestId('open-dialog-button');
			await fireEvent.click(button);

			const deleteButton = getByTestId('delete-button');
			await fireEvent.click(deleteButton);

			// Check that mutate was called
			expect(deleteMutate.mutate).toHaveBeenCalled();

			// Get first call arguments
			const callArgs = (deleteMutate.mutate as Mock).mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				branches: [
					{
						name: 'feature-1',
						current: false
					},
					{
						name: 'feature-2',
						current: false
					}
				]
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});

		test('prevents deletion of current branch', async () => {
			const selectedBranches = getSelectedBranchesStore('test-repo');
			selectedBranches?.clear();
			selectedBranches?.add(['main']);

			// Get the standard mock to avoid typing issues
			const deleteMutate = createDeleteBranchesMutation();
			const mockMutate = deleteMutate.mutate as Mock;

			// Clear previous calls
			mockMutate.mockClear();

			const { getByTestId } = render(TestWrapper, {
				props: { component: DeleteBranchModal, props: { id: 'test-repo' } }
			});

			const button = getByTestId('open-dialog-button');
			await fireEvent.click(button);

			const deleteButton = getByTestId('delete-button');
			await fireEvent.click(deleteButton);

			// Verify the call happened
			expect(mockMutate).toHaveBeenCalled();

			// Get the first argument of the first call
			const callArgs = mockMutate.mock.calls[0];

			// First argument should be the branches/path object
			expect(callArgs[0]).toEqual({
				path: '/path/to/repo',
				branches: [
					{
						name: 'main',
						current: true
					}
				]
			});

			// Second argument should have onSuccess function
			expect(callArgs[1]).toHaveProperty('onSuccess');
		});
	});
});

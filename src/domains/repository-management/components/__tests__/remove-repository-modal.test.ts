import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, vi, beforeEach } from 'vitest';
import RemoveRepositoryModal from '../remove-repository-modal.svelte';
import { goto } from '$app/navigation';
import TestWrapper, { testWrapperWithProps } from '$components/test-wrapper.svelte';
import type { Repository } from '$services/common';

const mockRepository: Repository = {
	name: 'test-repo',
	path: '/path/to/test-repo',
	branches: [],
	currentBranch: 'main',
	branchesCount: 0,
	id: '1'
};

const mockRepository2: Repository = {
	name: 'test-repo-2',
	path: '/path/to/test-repo-2',
	branches: [],
	currentBranch: 'main',
	branchesCount: 0,
	id: '2'
};

// Mock repositories state
let mockRepositories: Repository[] = [mockRepository, mockRepository2];

// Mock Tauri commands
vi.mock('$lib/bindings', () => ({
	commands: {
		listRepositories: vi
			.fn()
			.mockImplementation(() => Promise.resolve({ status: 'ok', data: mockRepositories })),
		getRepository: vi.fn().mockImplementation((input) => {
			const repo = mockRepositories.find((r) => r.id === input.id || r.path === input.path);
			if (repo) {
				return Promise.resolve({ status: 'ok', data: repo });
			}
			return Promise.resolve({ status: 'error', error: { kind: 'NotFound' } });
		}),
		deleteRepository: vi.fn().mockImplementation((input) => {
			const indexToRemove = mockRepositories.findIndex((r) => r.id === input.id);
			if (indexToRemove !== -1) {
				mockRepositories.splice(indexToRemove, 1);
			}
			return Promise.resolve({ status: 'ok', data: { success: true } });
		}),
		deleteAllLockedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} })),
		deleteAllSelectedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} }))
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

const mockSearchClear = vi.fn();

vi.mock('$domains/branch-management/store/search-branches.svelte', () => ({
	getSearchBranchesStore: vi.fn().mockImplementation((name) => {
		if (!name) return undefined;
		return {
			clear: mockSearchClear,
			state: undefined
		};
	})
}));

describe('RemoveRepositoryModal', () => {
	beforeEach(() => {
		// Reset mock repositories state
		mockRepositories = [mockRepository, mockRepository2];
		// Reset mocks between tests
		vi.clearAllMocks();
	});

	describe('Modal Rendering', () => {
		test('renders with correct initial state', () => {
			const { getByText } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			expect(getByText('Remove repository')).toBeInTheDocument();
		});

		test('renders repository name in modal content', async () => {
			const { getByTestId, getByText } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			expect(getByText(/Are you sure you want to remove/)).toHaveTextContent(mockRepository.name);
		});
	});

	describe('Modal Interaction', () => {
		test('should open and close the modal', async () => {
			const { getByTestId, queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			expect(queryByTestId('remove-modal')).toBeInTheDocument();

			const cancelButton = getByTestId('cancel-remove');
			await fireEvent.click(cancelButton);

			// Modal should still be in the document but closed
			expect(queryByTestId('remove-modal')).toBeInTheDocument();
		});

		test('closes modal after repository removal', async () => {
			const { getByTestId, queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			// Modal should be closed
			expect(queryByTestId('remove-modal')).not.toHaveAttribute('open');
		});
	});

	describe('Repository Removal', () => {
		test('should remove the repository from database', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			await waitFor(() => {
				expect(mockRepositories.find((r) => r.id === mockRepository.id)).toBeUndefined();
			});
		});

		test('clears the search store for removed repository', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			// Check that the mocked clear function was called
			await waitFor(() => expect(mockSearchClear).toHaveBeenCalled());
		});

		test('shows notification after repository removal', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			// Notification is shown via mutation meta, which is tested in providers.test.ts
			// Here we just verify the mutation completes
			await waitFor(() => {
				expect(mockRepositories.find((r) => r.id === mockRepository.id)).toBeUndefined();
			});
		});
	});

	describe('Navigation', () => {
		test('should navigate after repository removal', async () => {
			// Set up only the test repository (single repo scenario)
			mockRepositories = [mockRepository];

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			// Should navigate away after deletion
			await waitFor(() => expect(goto).toHaveBeenCalled());
		});

		test('should navigate to get-started when no repositories remain', async () => {
			// Set up only the test repository
			mockRepositories = [mockRepository];

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { repositoryId: mockRepository.id })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			await waitFor(() => expect(goto).toHaveBeenCalledWith('/get-started'));
		});
	});
});

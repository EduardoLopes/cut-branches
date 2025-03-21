import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, vi, beforeEach } from 'vitest';
import RemoveRepositoryModal from '../remove-repository-modal.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import { goto } from '$app/navigation';
import { notifications } from '$lib/stores/notifications.svelte';
import {
	getRepositoryStore,
	RepositoryStore,
	type Repository
} from '$lib/stores/repository.svelte';
import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';

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

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

const mockSearchClear = vi.fn();
const mockSearchSet = vi.fn();

vi.mock('$lib/stores/search-branches.svelte', () => ({
	getSearchBranchesStore: vi.fn().mockImplementation((name) => {
		if (!name) return undefined;
		return {
			set: mockSearchSet,
			clear: mockSearchClear,
			state: undefined
		};
	})
}));

describe('RemoveRepositoryModal', () => {
	beforeEach(() => {
		getSearchBranchesStore(mockRepository?.name);
		getRepositoryStore(mockRepository?.name);
		const repository = getRepositoryStore(mockRepository?.name);
		repository?.set(mockRepository);

		getSearchBranchesStore(mockRepository2?.name);
		getRepositoryStore(mockRepository2?.name);
		const repository2 = getRepositoryStore(mockRepository2?.name);
		repository2?.set(mockRepository2);

		// Reset mocks between tests
		vi.clearAllMocks();
	});

	describe('Modal Rendering', () => {
		test('renders with correct initial state', () => {
			const { getByText } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			expect(getByText('Remove repository')).toBeInTheDocument();
		});

		test('renders repository name in modal content', async () => {
			const { getByTestId, getByText } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			expect(getByText(/Are you sure you want to remove/)).toHaveTextContent(mockRepository.name);
		});
	});

	describe('Modal Interaction', () => {
		test('should open and close the modal', async () => {
			const { getByTestId, queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
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
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
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
		test('should remove the repository from store', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			const repository = getRepositoryStore(mockRepository?.name);

			expect(RepositoryStore.repositories?.has(mockRepository.name)).toBeFalsy();
			expect(repository?.state).toBeUndefined();
		});

		test('clears the search store for removed repository', async () => {
			const searchStore = getSearchBranchesStore(mockRepository?.name);

			// Ensure searchStore exists (matches mock implementation in the setup)
			expect(searchStore).toBeDefined();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			expect(searchStore?.clear).toHaveBeenCalled();
		});

		test('shows notification after repository removal', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			expect(notifications.push).toHaveBeenCalledWith({
				title: expect.stringContaining('Repository removed'),
				message: expect.stringContaining(mockRepository.name),
				feedback: 'success'
			});
		});
	});

	describe('Navigation', () => {
		test('should navigate to another repository if available', async () => {
			// Clear mock calls to ensure clean state
			vi.clearAllMocks();

			// Clear any existing repositories
			RepositoryStore.repositories?.clear();

			// Add both repositories to the store
			const firstRepo = getRepositoryStore(mockRepository?.name);
			firstRepo?.set(mockRepository);

			const secondRepo = getRepositoryStore(mockRepository2?.name);
			secondRepo?.set(mockRepository2);

			// Verify setup
			expect(RepositoryStore.repositories?.list).toHaveLength(2);
			expect(RepositoryStore.repositories?.has(mockRepository?.name)).toBeTruthy();
			expect(RepositoryStore.repositories?.has(mockRepository2?.name)).toBeTruthy();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			// After removing the first repository, it should navigate to the second one
			expect(goto).toHaveBeenCalledWith('/repos/test-repo-2');
		});

		test('should navigate to add-first when no repositories remain', async () => {
			// Reset mocks
			vi.clearAllMocks();

			// Make sure repository stores are cleared properly
			RepositoryStore.repositories?.clear();

			// Set up only the test repository
			const store = getRepositoryStore(mockRepository?.name);
			store?.set(mockRepository);

			// Verify setup
			expect(RepositoryStore.repositories?.list).toHaveLength(1);
			expect(RepositoryStore.repositories?.has(mockRepository2?.name)).toBeFalsy();

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
			});

			const openButton = getByTestId('open-remove-modal');
			await fireEvent.click(openButton);

			const removeButton = getByTestId('confirm-remove');
			await fireEvent.click(removeButton);

			expect(goto).toHaveBeenCalledWith('/add-first');
		});
	});
});

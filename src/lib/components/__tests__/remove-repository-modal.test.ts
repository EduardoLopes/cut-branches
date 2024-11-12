import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import RemoveRepositoryModal from '../remove-repository-modal.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import { goto } from '$app/navigation';
import {
	getRepositoryStore,
	RepositoryStore,
	type Repository
} from '$lib/stores/repository.svelte';

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

vi.mock('$lib/stores/search-branches.svelte', () => ({
	getSearchBranchesStore: vi.fn(() => ({
		set: vi.fn()
	}))
}));

describe('RemoveRepositoryModal', () => {
	it('should open and close the modal', async () => {
		const { getByTestId, queryByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
		});

		const openButton = getByTestId('open-remove-modal');
		await fireEvent.click(openButton);

		expect(queryByTestId('remove-modal')).toBeInTheDocument();

		const cancelButton = getByTestId('cancel-remove');
		await fireEvent.click(cancelButton);

		expect(queryByTestId('remove-modal')).toBeInTheDocument();
	});

	it('should remove the repository', async () => {
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

	it('should navigate to "first" repository', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(RemoveRepositoryModal, { currentRepo: mockRepository })
		});

		const repository = getRepositoryStore(mockRepository2?.name);

		repository?.set(mockRepository2);

		const openButton = getByTestId('open-remove-modal');
		await fireEvent.click(openButton);

		const removeButton = getByTestId('confirm-remove');
		await fireEvent.click(removeButton);

		expect(goto).toHaveBeenCalledWith('/repos/test-repo-2');
	});

	it('should navigate to "add-first"', async () => {
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

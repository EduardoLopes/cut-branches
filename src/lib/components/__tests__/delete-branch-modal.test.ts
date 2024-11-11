import { render, fireEvent } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import DeleteBranchModal from '../delete-branch-modal.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { useDeleteBranchesMutation } from '$lib/services/useDeleteBranchesMutation';
import { getRepositoryStore, type Branch } from '$lib/stores/repository.svelte';
import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';

vi.mock('$app/stores', () => {
	return {
		page: readable({ params: { id: 'test-repo' } })
	};
});

vi.mock('$lib/services/useDeleteBranchesMutation', () => ({
	useDeleteBranchesMutation: vi.fn()
}));

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock('$lib/services/useDeleteBranchesMutation', () => ({
	useDeleteBranchesMutation: vi.fn().mockReturnValue({
		mutate: vi.fn()
	})
}));

const mockBranches: Branch[] = [
	{
		name: 'main',
		current: true,
		last_commit: {
			hash: 'abc123',
			date: '2023-01-01',
			message: 'Initial commit',
			author: 'John Doe',
			email: 'john@example.com'
		},
		fully_merged: false
	},
	{
		name: 'feature-1',
		current: false,
		last_commit: {
			hash: 'def456',
			date: '2023-01-02',
			message: 'Add feature 1',
			author: 'Jane Doe',
			email: 'jane@example.com'
		},
		fully_merged: false
	}
];

describe('DeleteBranchModal Component', () => {
	beforeEach(() => {
		const repository = getRepositoryStore('test-repo');
		repository?.set({
			name: 'test-repo',
			currentBranch: 'main',
			path: '/path/to/repo',
			branchesCount: 2,
			id: '1',
			branches: mockBranches
		});

		const selectedBranches = getSelectedBranchesStore('test-repo');
		selectedBranches?.add(['feature-1']);
	});

	test('renders correctly', () => {
		const { getByText } = render(TestWrapper, {
			props: { component: DeleteBranchModal }
		});
		expect(getByText('Delete branches')).toBeInTheDocument();
	});

	test('opens modal on button click', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: { component: DeleteBranchModal }
		});
		const button = getByTestId('open-dialog-button');
		await fireEvent.click(button);
		const dialogQuestion = getByTestId('delete-branch-dialog-question');
		expect(dialogQuestion).toHaveTextContent(
			'Are you sure you want these branches from the repository test-repo?'
		);
	});

	test('calls handleDelete on delete button click', async () => {
		const deleteMutate = useDeleteBranchesMutation();

		const { getByTestId } = render(TestWrapper, {
			props: { component: DeleteBranchModal }
		});
		const button = getByTestId('open-dialog-button');
		await fireEvent.click(button);

		const deleteButton = getByTestId('delete-button');
		await fireEvent.click(deleteButton);

		expect(deleteMutate.mutate).toHaveBeenCalledWith({
			path: '/path/to/repo',
			branches: [mockBranches[1]]
		});
	});

	test('calls handleCancel on cancel button click', async () => {
		const { getByTestId, getByText } = render(TestWrapper, {
			props: { component: DeleteBranchModal }
		});
		const button = getByTestId('open-dialog-button');
		await fireEvent.click(button);

		const cancelButton = getByTestId('cancel-button');
		await fireEvent.click(cancelButton);

		expect(getByText('Delete branches')).toBeInTheDocument();
	});
});

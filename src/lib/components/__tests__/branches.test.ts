import { render, fireEvent } from '@testing-library/svelte';
import Branches from '../branches.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
import { getRepoByPath } from '$lib/services/getRepoByPath';
import { getRepositoryStore, type Repository } from '$lib/stores/repository.svelte';
import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';

const mockRepository: Repository = {
	name: 'test-repo',
	path: '/path/to/test-repo',
	branches: [
		{
			name: 'main',
			current: true,
			last_commit: {
				hash: 'abc123',
				message: 'Initial commit',
				date: '2023-01-01',
				author: 'John Doe',
				email: 'john.doe@example.com'
			},
			fully_merged: true
		},
		{
			name: 'feature/test-branch',
			current: false,
			last_commit: {
				hash: 'abc124',
				message: 'Initial commit 2',
				date: '2023-02-01',
				author: 'John Doe 2',
				email: 'john.doe2@example.com'
			},
			fully_merged: false
		}
	],
	currentBranch: 'main',
	branchesCount: 0,
	id: '1'
};

vi.mock('$lib/services/createSwitchBranchMutation', () => ({
	createSwitchbranchMutation: vi.fn().mockReturnValue({
		mutate: vi.fn()
	})
}));

vi.mock('$lib/services/getRepoByPath', () => ({
	getRepoByPath: vi.fn().mockReturnValue({
		refetch: vi.fn().mockResolvedValue({
			data: {
				name: 'test-repo',
				path: '/path/to/test-repo',
				branches: [
					{
						name: 'main',
						current: true,
						last_commit: {
							hash: 'abc123',
							message: 'Initial commit',
							date: '2023-01-01',
							author: 'John Doe',
							email: 'john.doe@example.com'
						},
						fully_merged: true
					},
					{
						name: 'feature/test-branch',
						current: false,
						last_commit: {
							hash: 'abc124',
							message: 'Initial commit 2',
							date: '2023-02-01',
							author: 'John Doe 2',
							email: 'john.doe2@example.com'
						},
						fully_merged: false
					}
				],
				currentBranch: 'main',
				branchesCount: 0,
				id: '1'
			},
			isSuccess: true,
			isError: false,
			dataUpdatedAt: Date.now()
		})
	})
}));

beforeEach(() => {
	const repository = getRepositoryStore(mockRepository.name);
	const _search = getSearchBranchesStore(mockRepository.name);
	repository?.set(mockRepository);
	vi.useFakeTimers();
});

describe('Branches Component', () => {
	test('updates the repository', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(Branches, {
				id: mockRepository.name
			})
		});

		const oneMinute = 60000;
		const repository = getRepositoryStore(mockRepository.name);

		const getRepoByPathQuery = getRepoByPath(() => repository?.state?.path, {
			staleTime: oneMinute
		});

		const updateButton = getByTestId('update-button');
		await fireEvent.click(updateButton);
		expect(getRepoByPathQuery.refetch).toBeCalled();
	});

	test('handles branch switching', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(Branches, {
				id: mockRepository.name
			})
		});
		const switchButton = getByTestId('switch-button');
		await fireEvent.click(switchButton);

		const switchBranchMutation = createSwitchbranchMutation();

		expect(switchBranchMutation.mutate).toHaveBeenCalledWith({
			path: mockRepository.path,
			branch: mockRepository.branches[1].name
		});
	});

	test('clears the search', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(Branches, {
				id: mockRepository.name
			})
		});

		const clearSearchButton = getByTestId('clear-search-button');
		await fireEvent.click(clearSearchButton);

		const searchStore = getSearchBranchesStore(mockRepository.name)!;
		expect(searchStore?.state).toBe(undefined);
	});
});

import { render, fireEvent } from '@testing-library/svelte';
import type { Mock } from 'vitest';
import Branches from '../branches.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
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

vi.mock('$lib/services/createGetRepositoryByPathQuery', () => ({
	createGetRepositoryByPathQuery: vi.fn().mockReturnValue({
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
	repository?.set(mockRepository);

	const searchStore = getSearchBranchesStore(mockRepository.name)!;
	searchStore?.clear();
	vi.useFakeTimers();
	vi.clearAllMocks();
});

describe('Branches Component', () => {
	describe('Repository Updates', () => {
		test('updates the repository when update button is clicked', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			const oneMinute = 60000;
			const repository = getRepositoryStore(mockRepository.name);

			const getRepoByPathQuery = createGetRepositoryByPathQuery(() => repository?.state?.path, {
				staleTime: oneMinute
			});

			const updateButton = getByTestId('update-button');
			await fireEvent.click(updateButton);
			expect(getRepoByPathQuery.refetch).toBeCalled();
		});

		test('displays repository information correctly', () => {
			const { getByText } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			expect(
				getByText(mockRepository.name, {
					selector: 'h2'
				})
			).toBeInTheDocument();
			expect(
				getByText(mockRepository.branches[0].name, {
					selector: 'span'
				})
			).toBeInTheDocument();
			expect(
				getByText(mockRepository.branches[1].name, {
					selector: 'span'
				})
			).toBeInTheDocument();
		});

		test('handles errors during repository update', async () => {
			// Create mock for refetch function
			const mockRefetch = vi.fn().mockResolvedValue({
				isError: true,
				error: new Error('Failed to fetch repository')
			});

			// Set up the mock to return our configured mock function
			(createGetRepositoryByPathQuery as Mock).mockReturnValue({
				refetch: mockRefetch
			});

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			const updateButton = getByTestId('update-button');
			await fireEvent.click(updateButton);

			// Check if our mockRefetch was called
			expect(mockRefetch).toBeCalled();
		});
	});

	describe('Branch Switching', () => {
		test('handles branch switching when switch button is clicked', async () => {
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

		test('selects the correct branch for switching', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			// First select a branch using test ID instead of role
			const featureBranchItem = getByTestId('branch-item-feature/test-branch');
			await fireEvent.click(featureBranchItem);

			// Then click switch
			const switchButton = getByTestId('switch-button');
			await fireEvent.click(switchButton);

			const switchBranchMutation = createSwitchbranchMutation();

			expect(switchBranchMutation.mutate).toHaveBeenCalledWith({
				path: mockRepository.path,
				branch: mockRepository.branches[1].name
			});
		});
	});

	describe('Search Functionality', () => {
		test('clears the search when clear button is clicked', async () => {
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

		test('filters branches based on search term', async () => {
			const { getByPlaceholderText, getByTestId, queryByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			// Get the search input
			const searchInput = getByPlaceholderText('Search branches');

			// Type 'feature' to filter branches
			await fireEvent.input(searchInput, { target: { value: 'feature' } });

			// Should show feature branch but not main
			expect(getByTestId('branch-item-feature/test-branch')).toBeInTheDocument();
			expect(queryByTestId('branch-item-main')).not.toBeInTheDocument();
		});

		test('shows no results message when search has no matches', async () => {
			const { getByPlaceholderText, getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			// Get the search input
			const searchInput = getByPlaceholderText('Search branches') as HTMLInputElement;

			// Type a term that won't match any branches
			await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

			const noResultsMessage = getByTestId('no-results-message');
			// Should show no results message
			expect(noResultsMessage).toHaveTextContent('No results for nonexistent!');
		});
	});

	describe('UI Elements', () => {
		test('disables switch button when current branch is selected', () => {
			const mockMutate = vi.fn();
			(createSwitchbranchMutation as Mock).mockReturnValueOnce({
				mutate: mockMutate,
				isPending: true,
				variables: {
					branch: mockRepository.branches[0].name
				}
			});

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			// Select the current branch using test ID
			const mainBranchItem = getByTestId('branch-item-main');
			fireEvent.click(mainBranchItem);

			const switchButton = getByTestId('switch-button');
			expect(switchButton).toBeDisabled();
		});

		test('enables switch button when non-current branch is selected', () => {
			const mockMutate = vi.fn();
			(createSwitchbranchMutation as Mock).mockReturnValueOnce({
				mutate: mockMutate
			});

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Branches, {
					id: mockRepository.name
				})
			});

			// Select a non-current branch using test ID
			const featureBranchItem = getByTestId('branch-item-feature/test-branch');
			fireEvent.click(featureBranchItem);

			const switchButton = getByTestId('switch-button');
			expect(switchButton).not.toBeDisabled();
		});
	});
});

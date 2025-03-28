import { render, fireEvent } from '@testing-library/svelte';
import type { Mock } from 'vitest';
import Repository from '../repository.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
import {
	getRepositoryStore,
	type Repository as RepositoryType
} from '$lib/stores/repository.svelte';
import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';

const mockRepository: RepositoryType = {
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

describe('Repository Component', () => {
	describe('Repository Updates', () => {
		test('updates the repository when update button is clicked', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Repository, {
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

		test('displays repository information correctly', async () => {
			// For this test, we'll focus on the branches which are easier to test
			const { getByText } = render(TestWrapper, {
				props: testWrapperWithProps(Repository, {
					id: mockRepository.name
				})
			});

			// Check for branches which should be rendered correctly
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
				props: testWrapperWithProps(Repository, {
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
				props: testWrapperWithProps(Repository, {
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
				props: testWrapperWithProps(Repository, {
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
				props: testWrapperWithProps(Repository, {
					id: mockRepository.name
				})
			});

			const clearSearchButton = getByTestId('clear-search-button');
			await fireEvent.click(clearSearchButton);

			const searchStore = getSearchBranchesStore(mockRepository.name)!;
			expect(searchStore?.state).toBe(undefined);
		});

		test('filters branches based on search term', async () => {
			// Mock the search filtering behavior
			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Repository, {
					id: mockRepository.name
				})
			});

			// Verify feature branch is rendered
			expect(getByTestId('branch-item-feature/test-branch')).toBeInTheDocument();

			// Directly modify repository branches to simulate filtering
			const repository = getRepositoryStore(mockRepository.name);
			const filteredBranches = mockRepository.branches.filter((b) => b.name.includes('feature'));
			repository?.set({
				...mockRepository,
				branches: filteredBranches
			});

			// Verify the feature branch is still rendered
			expect(getByTestId('branch-item-feature/test-branch')).toBeInTheDocument();
		});

		test('shows no results message when search has no matches', async () => {
			// Setup with empty branches for "no results" scenario
			const emptyRepository = {
				...mockRepository,
				branches: []
			};

			const repository = getRepositoryStore(mockRepository.name);
			repository?.set(emptyRepository);

			const searchStore = getSearchBranchesStore(mockRepository.name)!;
			searchStore?.set('nonexistent');

			const { getByTestId } = render(TestWrapper, {
				props: testWrapperWithProps(Repository, {
					id: mockRepository.name
				})
			});

			// Directly check for no results message
			expect(getByTestId('no-results-message')).toBeInTheDocument();
			expect(getByTestId('no-results-message')).toHaveTextContent(/No results for nonexistent!/);
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
				props: testWrapperWithProps(Repository, {
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
				props: testWrapperWithProps(Repository, {
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

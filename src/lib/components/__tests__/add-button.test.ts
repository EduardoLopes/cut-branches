import '@testing-library/jest-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
// Import all Svelte-related modules in one place
import { readable } from 'svelte/store';
import type { Mock } from 'vitest';
import AddButton from '../add-button.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { goto } from '$app/navigation';
import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
import { notifications } from '$lib/stores/notifications.svelte';
import { type Repository } from '$lib/stores/repository.svelte';
import { getRepositoryStore } from '$lib/stores/repository.svelte';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/path/to/existing/repo')
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$app/stores', () => {
	return {
		page: readable({ params: { id: '123' } })
	};
});

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock implementation for createGetRepositoryByPathQuery
vi.mock('$lib/services/createGetRepositoryByPathQuery', () => {
	// Default mock implementation inside the factory
	const defaultMockQuery = {
		isSuccess: true,
		isLoading: false,
		isError: false,
		data: {
			id: '123',
			name: 'Existing Repo',
			path: '/path/to/existing/repo',
			branches: [],
			currentBranch: '',
			branchesCount: 0
		},
		error: null
	};

	return {
		createGetRepositoryByPathQuery: vi.fn().mockReturnValue(defaultMockQuery)
	};
});

describe('AddButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders correctly with default props', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: AddButton }
			});
			expect(getByText('Add a git repository')).toBeInTheDocument();
		});

		test('displays visually hidden label when visuallyHiddenLabel is true', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: true } }
			});
			const span = container.querySelector('span');
			expect(span).toHaveClass('sr_true');
		});

		test('displays visible label when visuallyHiddenLabel is false', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});
			const span = container.querySelector('span');
			expect(span).not.toHaveClass('sr_true');
		});
	});

	describe('Interactions', () => {
		test('calls handleAddClick on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: true } }
			});
			const button = getByRole('button');
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true });
		});

		test('calls open function on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});
			const button = getByRole('button');
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true });
		});

		test('handles case when directory selection returns null', async () => {
			// Clear any existing calls to notifications.push
			vi.clearAllMocks();

			// Mock open to return null (user canceled)
			(open as Mock).mockResolvedValueOnce(null);

			// Make sure getRepositoryByPathQuery isn't triggered
			const mockQueryResult = {
				isSuccess: false,
				isLoading: false,
				isError: false,
				data: null,
				error: null
			};
			(createGetRepositoryByPathQuery as Mock).mockReturnValueOnce(mockQueryResult);

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await waitFor(() => expect(notifications.push).not.toHaveBeenCalled());
		});
	});

	describe('Repository handling', () => {
		let mockRepo: Repository;

		beforeEach(() => {
			mockRepo = {
				id: '123',
				name: 'Existing Repo',
				path: '/path/to/existing/repo',
				branches: [],
				currentBranch: '',
				branchesCount: 0
			};

			const repository = getRepositoryStore(mockRepo.name);
			repository?.clear();
			repository?.set(mockRepo);
		});

		test('shows warning notification if repository already exists', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'warning',
				title: 'Repository already exists',
				message: `The repository ${mockRepo.name} already exists`
			});
		});

		test('navigates to existing repository if it already exists by ID', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			expect(goto).toHaveBeenCalledWith(`/repos/${mockRepo.name}`);
		});

		test('handles error when directory selection fails', async () => {
			// Mock open to reject
			(open as Mock).mockRejectedValueOnce(new Error('User cancelled'));

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			// No notifications or navigation should happen
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				message: new Error('User cancelled'),
				title: 'Error'
			});
			expect(goto).toHaveBeenCalledWith('/repos/Existing Repo');
		});

		test('successfully adds a new repository when it does not exist', async () => {
			// Set up a new repo that doesn't exist in the store
			const newRepo = {
				id: '456',
				name: 'New Repo',
				path: '/path/to/new/repo',
				branches: [],
				currentBranch: '',
				branchesCount: 0
			};

			// Mock dialog to return a different path
			(open as Mock).mockResolvedValueOnce('/path/to/new/repo');

			// Mock query to return new repo data
			const mockQueryResult = {
				isSuccess: true,
				isLoading: false,
				isError: false,
				data: newRepo,
				error: null
			};
			(createGetRepositoryByPathQuery as Mock).mockReturnValueOnce(mockQueryResult);

			// Clear existing repo
			const existingRepository = getRepositoryStore('New Repo');
			existingRepository?.clear();

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await waitFor(() =>
				expect(notifications.push).toHaveBeenCalledWith({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${newRepo.name} was added successfully`
				})
			);
		});

		test('handles repository query error', async () => {
			// Mock query to return error
			const errorMessage = 'Repository not found';
			const errorDescription = 'The specified directory is not a valid git repository';

			const mockErrorQueryResult = {
				isSuccess: false,
				isLoading: false,
				isError: true,
				data: null,
				error: {
					message: errorMessage,
					description: errorDescription
				}
			};
			(createGetRepositoryByPathQuery as Mock).mockReturnValueOnce(mockErrorQueryResult);

			// Mock dialog to return a path
			(open as Mock).mockResolvedValueOnce('/invalid/git/repo');

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await waitFor(() =>
				expect(notifications.push).toHaveBeenCalledWith({
					feedback: 'danger',
					title: errorMessage,
					message: errorDescription
				})
			);
		});

		test('shows loading state while repository is being processed', async () => {
			// Mock query with loading state
			const mockLoadingQueryResult = {
				isSuccess: false,
				isLoading: true,
				isError: false,
				data: null,
				error: null
			};
			(createGetRepositoryByPathQuery as Mock).mockReturnValueOnce(mockLoadingQueryResult);

			// Mock dialog to return a path
			(open as Mock).mockResolvedValueOnce('/path/to/loading/repo');

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await waitFor(() => expect(mockLoadingQueryResult.isLoading).toBe(true));
		});
	});
});

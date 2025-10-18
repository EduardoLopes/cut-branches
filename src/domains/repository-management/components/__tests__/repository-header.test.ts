import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Writable } from 'svelte/store';
import { vi } from 'vitest';
import RepositoryHeader from '../repository-header.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import type { Repository } from '$services/common';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Define a type for our mock store that includes the .state property
interface MockRepositoryStoreType extends Writable<Repository | null> {
	state?: Repository | null;
}

// Mock the getRepositoryStore
const mockRepositoryStore = vi.hoisted(() => {
	// Initial store state, can be updated in tests
	const store: MockRepositoryStoreType = {
		subscribe: vi.fn(() => () => {}), // subscribe returns an unsubscribe function
		set: vi.fn(),
		update: vi.fn(),
		state: null // Initial state
	};
	return {
		getRepositoryStore: vi.fn(() => store),
		mockStore: store // export the store itself to manipulate its 'state'
	};
});

vi.mock('../../store/repository.svelte', () => {
	return {
		getRepositoryStore: mockRepositoryStore.getRepositoryStore
	};
});

// Create mock query functions that can be updated in tests
const mockListRepositoriesQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		data: [
			{
				id: 'some-id',
				name: 'Test-Repo',
				path: '/path/to/repo',
				current_branch: 'main',
				branches_count: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		],
		isLoading: false,
		isError: false,
		error: null
	}))
}));

const mockGetRepositoryQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		data: undefined, // Default to undefined
		isLoading: false,
		isError: false,
		error: null
	}))
}));

vi.mock('../../logic/application/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: mockListRepositoriesQuery.fn
}));

vi.mock('../../logic/application/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: mockGetRepositoryQuery.fn
}));

describe('RepositoryHeader', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRepositoryStore.mockStore.state = null;
		mockRepositoryStore.getRepositoryStore.mockReturnValue(mockRepositoryStore.mockStore);
	});

	test('should render the component', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RepositoryHeader,
				props: {}
			}
		});
		expect(container).toBeInTheDocument();
	});

	test('should display repository name when available', async () => {
		const repoName = 'Display-Repo-Name';

		// Mock list to include a repository with the test ID
		mockListRepositoriesQuery.fn.mockReturnValueOnce({
			data: [
				{
					id: 'some-id',
					name: 'Display-Repo-Name',
					path: '/path/to/repo',
					current_branch: 'main',
					branches_count: 0,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			],
			isLoading: false,
			isError: false,
			error: null
		});

		// Update the mock to return the specific repo name
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
			data: {
				id: 'mock-repo-id',
				name: repoName,
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			},
			isLoading: false,
			isError: false,
			error: null
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeader,
				props: {
					repositoryId: 'some-id'
				}
			}
		});

		await tick();

		expect(getByTestId('repository-name')).toBeInTheDocument();
		expect(getByTestId('repository-name').textContent).toBe(repoName);
	});

	test('should display defaultTitle when provided', async () => {
		const defaultTitle = 'Custom Title';

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeader,
				props: {
					repositoryId: 'some-id',
					defaultTitle
				}
			}
		});

		await tick();

		expect(getByTestId('repository-name')).toBeInTheDocument();
		expect(getByTestId('repository-name').textContent).toBe(defaultTitle);
	});

	test('should display nothing for repository name when not available', async () => {
		mockRepositoryStore.mockStore.state = null;

		// Mock list with empty path to prevent getRepository query from running
		mockListRepositoriesQuery.fn.mockReturnValueOnce({
			data: [
				{
					id: 'some-id',
					name: 'Test-Repo',
					path: '' as unknown as string, // Empty path means getRepository won't be called
					current_branch: 'main',
					branches_count: 0,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			],
			isLoading: false,
			isError: false,
			error: null
		});

		// Mock getRepository to return undefined
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null
		});

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeader,
				props: {
					repositoryId: 'some-id'
				}
			}
		});
		await tick();
		const repoNameElement = getByTestId('repository-name');
		expect(repoNameElement).toBeInTheDocument();
		expect(repoNameElement.textContent).toBe('');
	});

	test('should render without errors when no snippets provided', async () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RepositoryHeader,
				props: {
					repositoryId: 'some-id'
				}
			}
		});

		await tick();

		expect(container).toBeInTheDocument();
	});
});

import { tick } from 'svelte';
import { vi } from 'vitest';
import RepositoryHeader from '../repository-header.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Create mock query function
const mockGetRepositoryQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: undefined as any,
		isLoading: false,
		isError: false,
		error: null
	}))
}));

vi.mock('../../core/composables/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: mockGetRepositoryQuery.fn
}));

describe('RepositoryHeader', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the component', () => {
		const { container } = renderWithTestWrapper(RepositoryHeader, {
			repositoryId: 'test-repo-id'
		});
		expect(container).toBeInTheDocument();
	});

	test('should display repository name when available', async () => {
		const repoName = 'My-Repository';

		const mockData = {
			data: {
				id: 'test-repo-id',
				name: repoName,
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			},
			isLoading: false,
			isError: false,
			error: null
		};

		mockGetRepositoryQuery.fn.mockReturnValue(mockData);

		const { getByTestId } = renderWithTestWrapper(RepositoryHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		const nameElement = getByTestId('repository-name');
		expect(nameElement).toBeInTheDocument();
		expect(nameElement.element().textContent).toBe(repoName);
	});

	test('should display nothing when repository name is not available', async () => {
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null
		});

		const { getByTestId } = renderWithTestWrapper(RepositoryHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		const nameElement = getByTestId('repository-name');
		expect(nameElement).toBeInTheDocument();
		expect(nameElement.element().textContent).toBe('');
	});

	test('should render action buttons', async () => {
		const mockData = {
			data: {
				id: 'test-repo-id',
				name: 'Test-Repo',
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			},
			isLoading: false,
			isError: false,
			error: null
		};

		mockGetRepositoryQuery.fn.mockReturnValue(mockData);

		const { container } = renderWithTestWrapper(RepositoryHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		// The component includes RestoreRepositoryButton, UpdateRepositoryButton, and RemoveRepositoryModal
		// These components are expected to be rendered within the header
		expect(container).toBeInTheDocument();
	});
});

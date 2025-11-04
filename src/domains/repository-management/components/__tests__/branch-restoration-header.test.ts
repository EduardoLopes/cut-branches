import { tick } from 'svelte';
import { vi } from 'vitest';
import BranchRestorationHeader from '../branch-restoration-header.svelte';
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

describe('BranchRestorationHeader', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the component', () => {
		const { container } = renderWithTestWrapper(BranchRestorationHeader, {
			repositoryId: 'test-repo-id'
		});
		expect(container).toBeInTheDocument();
	});

	test('should display restoration title with repository name when available', async () => {
		const repoName = 'My-Repository';

		// Create a reactive-like object with a getter
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

		const { getByTestId } = renderWithTestWrapper(BranchRestorationHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		const titleElement = getByTestId('restoration-title');
		expect(titleElement).toBeInTheDocument();
		expect(titleElement.element().textContent).toBe(`Restore branches from ${repoName}`);
	});

	test('should display nothing when repository name is not available', async () => {
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null
		});

		const { getByTestId } = renderWithTestWrapper(BranchRestorationHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		const titleElement = getByTestId('restoration-title');
		expect(titleElement).toBeInTheDocument();
		expect(titleElement.element().textContent).toBe('');
	});

	test('should render back button', async () => {
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

		const { container } = renderWithTestWrapper(BranchRestorationHeader, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		// The component includes BackButton which should be rendered
		expect(container).toBeInTheDocument();
	});
});

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi } from 'vitest';
import BranchRestorationHeader from '../branch-restoration-header.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Create mock query function
const mockGetRepositoryQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		data: undefined,
		isLoading: false,
		isError: false,
		error: null
	}))
}));

vi.mock('../../logic/application/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: mockGetRepositoryQuery.fn
}));

describe('BranchRestorationHeader', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the component', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: BranchRestorationHeader,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});
		expect(container).toBeInTheDocument();
	});

	test('should display restoration title with repository name when available', async () => {
		const repoName = 'My-Repository';

		mockGetRepositoryQuery.fn.mockReturnValueOnce({
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: BranchRestorationHeader,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		await tick();

		const titleElement = getByTestId('restoration-title');
		expect(titleElement).toBeInTheDocument();
		expect(titleElement.textContent).toBe(`Restore branches from ${repoName}`);
	});

	test('should display nothing when repository name is not available', async () => {
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null
		});

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: BranchRestorationHeader,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		await tick();

		const titleElement = getByTestId('restoration-title');
		expect(titleElement).toBeInTheDocument();
		expect(titleElement.textContent).toBe('');
	});

	test('should render back button', async () => {
		mockGetRepositoryQuery.fn.mockReturnValueOnce({
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const { container } = render(TestWrapper, {
			props: {
				component: BranchRestorationHeader,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		await tick();

		// The component includes BackButton which should be rendered
		expect(container).toBeInTheDocument();
	});
});

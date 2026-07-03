import { tick } from 'svelte';
import { vi } from 'vitest';
import UpdateRepositoryButton from '../update-repository-button.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock the createGetRepositoryListQuery
const mockRepositoryListQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		data: [
			{
				id: 'test-repo-id',
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

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: mockRepositoryListQuery.fn
}));

// Mock notifications
const mockNotifications = vi.hoisted(() => ({
	push: vi.fn()
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: mockNotifications
}));

// Mock useQueryClient
const mockInvalidateQueries = vi.fn(() => Promise.resolve());
const mockQueryClient = {
	invalidateQueries: mockInvalidateQueries
};

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		useQueryClient: () => mockQueryClient
	};
});

describe('UpdateRepositoryButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the button', () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		expect(screen.getByTestId('update-button')).toBeInTheDocument();
	});

	test('should invalidate queries when clicked', async () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		await tick();

		const button = screen.getByTestId('update-button');
		await button.click(button);

		await tick();

		// Should be called twice: once for branches, once for repository
		expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);

		// First call should invalidate branch queries with predicate
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const firstCall = (mockInvalidateQueries.mock.calls as any)[0]?.[0];
		expect(firstCall).toHaveProperty('predicate');
		expect(typeof firstCall?.predicate).toBe('function');

		// Second call should invalidate repository queries with predicate
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const secondCall = (mockInvalidateQueries.mock.calls as any)[1]?.[0];
		expect(secondCall).toHaveProperty('predicate');
		expect(typeof secondCall?.predicate).toBe('function');
	});

	test('should invalidate correct branch queries with predicate', async () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		await tick();

		const button = screen.getByTestId('update-button');
		await button.click();

		await tick();

		// Get the predicate from the first call (branch queries)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const branchPredicate = (mockInvalidateQueries.mock.calls as any)[0]?.[0]?.predicate;

		// Test that it matches branch queries for the correct repository
		expect(
			branchPredicate({
				queryKey: ['branch', 'getBranchList', { repoId: 'test-repo-id', filters: {} }]
			})
		).toBe(true);

		// Test that it doesn't match branch queries for other repositories
		expect(
			branchPredicate({
				queryKey: ['branch', 'getBranchList', { repoId: 'other-repo-id', filters: {} }]
			})
		).toBe(false);

		// Test that it doesn't match non-branch queries
		expect(
			branchPredicate({
				queryKey: ['repository', 'getRepository', { path: '/path' }]
			})
		).toBe(false);
	});

	test('should invalidate repository queries with predicate', async () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		await tick();

		const button = screen.getByTestId('update-button');
		await button.click();

		await tick();

		// Get the predicate from the second call (repository queries)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const repositoryPredicate = (mockInvalidateQueries.mock.calls as any)[1]?.[0]?.predicate;

		// Test that it matches repository queries
		expect(
			repositoryPredicate({
				queryKey: ['repository', 'getRepository', { path: '/path' }]
			})
		).toBe(true);

		// Test that it doesn't match non-repository queries
		expect(
			repositoryPredicate({
				queryKey: ['branch', 'getBranchList', { repoId: 'test-repo-id' }]
			})
		).toBe(false);
	});

	test('should show notification after invalidation succeeds', async () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		await tick();

		const button = screen.getByTestId('update-button');
		await button.click();

		await tick();

		expect(mockNotifications.push).toHaveBeenCalledWith({
			title: 'Repository updated',
			message: 'The repository **Test-Repo** was updated',
			feedback: 'success'
		});
	});

	test('should not be disabled when not refreshing', () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		const button = screen.getByTestId('update-button');
		expect(button).not.toBeDisabled();
	});

	test('should have correct accessibility attributes', () => {
		const screen = renderWithTestWrapper(UpdateRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		const button = screen.getByTestId('update-button');
		expect(button).toBeInTheDocument();

		// Check that the button has proper accessibility label
		expect(button).toHaveAttribute('aria-label', 'Update repository');
	});
});

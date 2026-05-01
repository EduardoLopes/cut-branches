import { open } from '@tauri-apps/plugin-dialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddButton from '$domains/repository-management/components/add-button.svelte';
import { createGetRepositoryQuery } from '$domains/repository-management/core/composables/queries/create-get-repository-query';
import { notifications } from '$services/notifications/notifications.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn()
}));

// Mock notifications
vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock the repository query
vi.mock(
	'$domains/repository-management/core/composables/queries/create-get-repository-query',
	() => ({
		createGetRepositoryQuery: vi.fn()
	})
);

// Mock the repository store
vi.mock('$domains/repository-management/store/repository.svelte', () => {
	const emptyRepositories = new Map();

	return {
		getRepositoryStore: vi.fn().mockImplementation(() => ({
			set: vi.fn(),
			state: null,
			clear: vi.fn()
		})),
		RepositoryStore: {
			repositories: emptyRepositories
		}
	};
});

// Mock Tauri commands
vi.mock('$lib/bindings', () => ({
	commands: {
		createRepository: vi.fn(),
		getRepositoryRoot: vi.fn(),
		getRepository: vi.fn(),
		getRepositoryList: vi.fn().mockResolvedValue({ status: 'ok', data: [] })
	}
}));

describe('Navigation Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows error notification when dialog fails', async () => {
		// Mock dialog to reject
		(open as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error('User cancelled')
		);

		// Set up query mock to return a non-success state
		(createGetRepositoryQuery as ReturnType<typeof vi.fn>).mockReturnValue({
			isSuccess: false,
			isLoading: false,
			isError: false,
			data: null,
			error: null
		});

		// Render component
		const { getByRole } = renderWithTestWrapper(AddButton, {});

		// Find and click the button
		const button = getByRole('button');
		await button.click();

		// Verify error notification
		await vi.waitFor(() => {
			expect(notifications.push).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					feedback: 'danger'
					// Not checking message field since it contains an Error object
				})
			);
		});
	});

	it('returns a success notification when repository is added', async () => {
		// Mock successful dialog
		(open as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce('/path/to/repo');

		// Mock the createRepository command to return success
		const { commands } = await import('$lib/bindings');
		(commands.createRepository as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			status: 'ok',
			data: {
				id: 'test-repo-id',
				name: 'Test Repo',
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}
		});

		// Set up query mock to return success with a repo
		(createGetRepositoryQuery as ReturnType<typeof vi.fn>).mockReturnValue({
			isSuccess: true,
			isLoading: false,
			isError: false,
			data: {
				id: 'test-repo-id',
				name: 'Test Repo',
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}
		});

		// Render component
		const { getByRole } = renderWithTestWrapper(AddButton, {});

		// Find and click the button
		const button = getByRole('button');
		await button.click();

		// Verify success notification was shown
		await vi.waitFor(() => {
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: 'The repository Test Repo was added successfully'
			});
		});
	});
});

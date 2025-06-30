import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestWrapper from '$components/test-wrapper.svelte';
import { notifications } from '$domains/notifications/store/notifications.svelte';
import AddButton from '$domains/repository-management/components/add-button.svelte';
import { createGetRepositoryByPathQuery } from '$domains/repository-management/services/createGetRepositoryByPathQuery';

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn()
}));

// Mock notifications
vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock the repository query
vi.mock('$domains/repository-management/services/createGetRepositoryByPathQuery', () => ({
	createGetRepositoryByPathQuery: vi.fn()
}));

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
		(createGetRepositoryByPathQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			isSuccess: false,
			isLoading: false,
			isError: false,
			data: null,
			error: null
		});

		// Render component
		const { getByRole } = render(TestWrapper, {
			props: {
				component: AddButton
			}
		});

		// Find and click the button
		const button = getByRole('button');
		await fireEvent.click(button);

		// Verify error notification
		await waitFor(() => {
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

		// Set up query mock to return success with a repo
		(createGetRepositoryByPathQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			isSuccess: true,
			isLoading: false,
			isError: false,
			data: {
				id: 'Test Repo',
				name: 'Test Repo',
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}
		});

		// Render component
		const { getByRole } = render(TestWrapper, {
			props: {
				component: AddButton
			}
		});

		// Find and click the button
		const button = getByRole('button');
		await fireEvent.click(button);

		// Verify success notification was shown
		await waitFor(() => {
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: 'The repository Test Repo was added successfully'
			});
		});
	});
});

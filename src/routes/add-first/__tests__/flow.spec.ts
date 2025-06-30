import { open } from '@tauri-apps/plugin-dialog';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddFirstPage from '../+page.svelte';
import TestWrapper from '../../../components/test-wrapper.svelte';
import { goto } from '$app/navigation';
import { notifications } from '$domains/notifications/store/notifications.svelte';
import { createGetRepositoryByPathQuery } from '$domains/repository-management/services/createGetRepositoryByPathQuery';

// Mock the Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn()
}));

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock notifications store
vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock repository query
vi.mock('$domains/repository-management/services/createGetRepositoryByPathQuery', () => ({
	createGetRepositoryByPathQuery: vi.fn()
}));

// Mock store
vi.mock('$domains/repository-management/store/repository.svelte', () => {
	const repositories = new Map();
	return {
		getRepositoryStore: vi.fn().mockImplementation((id) => {
			if (!repositories.has(id)) {
				repositories.set(id, {
					state: null,
					set: vi.fn(),
					clear: vi.fn()
				});
			}
			return repositories.get(id);
		}),
		RepositoryStore: {
			repositories: new Map()
		}
	};
});

// Disable eslint rule for any in tests
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Add Repository Flow Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the AddFirst page with AddButton', async () => {
		// Mock necessary query functions to prevent errors
		// Using 'any' type assertion because the actual return type is complex and only needed for testing
		vi.mocked(createGetRepositoryByPathQuery).mockImplementation(
			() =>
				({
					isSuccess: false,
					isLoading: false,
					isError: false,
					data: null
				}) as any
		);

		render(TestWrapper, {
			props: {
				component: AddFirstPage
			}
		});

		// Verify heading is present
		const heading = screen.getByText('Cut Branches');
		expect(heading).toBeInTheDocument();

		// Verify the Add button is present
		const addButton = screen.getByRole('button');
		expect(addButton).toBeInTheDocument();
	});

	it('opens directory dialog when AddButton is clicked', async () => {
		// Mock a successful directory selection
		(open as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce('/mock/repo/path');

		// Mock query function to return a function
		vi.mocked(createGetRepositoryByPathQuery).mockImplementation(
			() =>
				({
					isSuccess: false,
					isLoading: false,
					isError: false,
					data: null,
					refetch: vi.fn().mockResolvedValue({})
				}) as any
		);

		render(TestWrapper, {
			props: {
				component: AddFirstPage
			}
		});

		const addButton = screen.getByRole('button');
		await fireEvent.click(addButton);

		// Check that the directory dialog was opened
		expect(open).toHaveBeenCalledWith({
			directory: true,
			multiple: false
		});

		// Wait for async operations to complete
		await tick();
	});

	it('shows notification when directory selection fails', async () => {
		// Mock necessary query functions to prevent errors
		vi.mocked(createGetRepositoryByPathQuery).mockImplementation(
			() =>
				({
					isSuccess: false,
					isLoading: false,
					isError: false,
					data: null
				}) as any
		);

		// Mock a failed directory selection
		(open as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error('User cancelled')
		);

		render(TestWrapper, {
			props: {
				component: AddFirstPage
			}
		});

		const addButton = screen.getByRole('button');
		await fireEvent.click(addButton);

		// Wait for async operations to complete
		await tick();

		// Verify error notification was shown
		await waitFor(() =>
			expect(notifications.push).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Error',
					feedback: 'danger'
				})
			)
		);

		// Navigation should not occur on error
		expect(goto).not.toHaveBeenCalled();
	});

	it('navigates to existing repository when one is found', async () => {
		// Mock a successful directory selection
		(open as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce('/mock/repo/path');

		// Set up repository mock data
		const mockRepoData = {
			id: 'Existing Repo',
			name: 'Existing Repo',
			path: '/mock/repo/path',
			branches: [],
			branchesCount: 0,
			currentBranch: 'main'
		};

		// Make sure RepositoryStore.repositories.has returns true to simulate an existing repo
		const { RepositoryStore } = await import(
			'$domains/repository-management/store/repository.svelte'
		);
		const hasSpy = vi.fn().mockReturnValue(true);
		RepositoryStore.repositories.has = hasSpy;

		// Mock repository query to indicate an existing repository
		vi.mocked(createGetRepositoryByPathQuery).mockImplementation(
			() =>
				({
					isSuccess: true,
					isLoading: false,
					isError: false,
					data: mockRepoData
				}) as any
		);

		render(TestWrapper, {
			props: {
				component: AddFirstPage
			}
		});

		const addButton = screen.getByRole('button');
		await fireEvent.click(addButton);

		// Wait for async operations to complete
		await tick();

		// Verify warning notification was shown
		await waitFor(() =>
			expect(notifications.push).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Repository already exists',
					feedback: 'warning'
				})
			)
		);
	});
});

/* eslint-enable @typescript-eslint/no-explicit-any */

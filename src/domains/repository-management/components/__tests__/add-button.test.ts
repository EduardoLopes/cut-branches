import '@testing-library/jest-dom';
import type { MutationOptions } from '@tanstack/svelte-query';
import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddButton from '../add-button.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import type { Repository } from '$services/common';

// Mock Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn()
}));

// Mock notifications
const { mockPush, mockMutate, mockInvalidateQueries } = vi.hoisted(() => {
	const mockPush = vi.fn();
	const mockMutate = vi.fn();
	const mockInvalidateQueries = vi.fn();
	return { mockPush, mockMutate, mockInvalidateQueries };
});

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: mockPush
	}
}));

vi.mock('@tanstack/svelte-query', async () => {
	const actual = await vi.importActual('@tanstack/svelte-query');
	return {
		...actual,
		useQueryClient: vi.fn(() => ({
			invalidateQueries: mockInvalidateQueries
		}))
	};
});

// Mock create repository mutation
vi.mock(
	'$domains/repository-management/core/composables/mutations/create-create-repository-mutation',
	() => ({
		createCreateRepositoryMutation: vi.fn((options: MutationOptions) => {
			// Store the options so we can call onSuccess later
			(globalThis as unknown as { __mutationOptions: MutationOptions }).__mutationOptions = options;
			return {
				mutate: mockMutate,
				isPending: false,
				isError: false,
				error: null
			};
		})
	})
);

describe('AddButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(open).mockResolvedValue('/path/to/repo');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete (globalThis as any).__mutationOptions;
	});

	describe('Rendering', () => {
		it('renders correctly with default props', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: AddButton }
			});
			expect(getByText('Add a git repository')).toBeInTheDocument();
		});

		it('displays visually hidden label when visuallyHiddenLabel is true', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: true } }
			});
			const span = container.querySelector('span');
			expect(span).toHaveClass('sr_true');
		});

		it('displays visible label when visuallyHiddenLabel is false', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});
			const span = container.querySelector('span');
			expect(span).not.toHaveClass('sr_true');
		});
	});

	describe('Interactions', () => {
		it('calls open function on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});
			const button = getByRole('button');
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
		});

		it('calls mutation when directory is selected', async () => {
			vi.mocked(open).mockResolvedValue('/path/to/repo');

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await tick();

			expect(mockMutate).toHaveBeenCalledWith({ path: '/path/to/repo' });
		});

		it('does not call mutation when directory selection is cancelled', async () => {
			vi.mocked(open).mockResolvedValue(null);

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);
			await tick();

			expect(mockMutate).not.toHaveBeenCalled();
		});

		it('shows error notification when directory selection fails', async () => {
			const mockError = new Error('Failed to open directory');
			vi.mocked(open).mockRejectedValue(mockError);

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			await waitFor(() => {
				expect(mockPush).toHaveBeenCalledWith({
					title: 'Error',
					message: mockError.message,
					feedback: 'danger'
				});
			});
		});
	});

	describe('Repository Creation Success', () => {
		it('configures mutation with success callback', async () => {
			vi.mocked(open).mockResolvedValue('/path/to/new/repo');

			render(TestWrapper, {
				props: { component: AddButton }
			});

			await tick();

			// Verify the mutation was configured with onSuccess
			const options = (globalThis as unknown as { __mutationOptions: MutationOptions })
				.__mutationOptions;
			expect(options).toBeDefined();
			expect(options.onSuccess).toBeDefined();
			expect(typeof options.onSuccess).toBe('function');
		});

		it('mutation success callback pushes notification', () => {
			const mockRepo: Repository = {
				id: 'new-repo-id',
				name: 'New Repo',
				path: '/path/to/new/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			};

			render(TestWrapper, {
				props: { component: AddButton }
			});

			// Get the stored mutation options and call onSuccess directly
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const options = (globalThis as any).__mutationOptions;
			if (options?.onSuccess) {
				options.onSuccess(mockRepo, undefined, undefined, undefined);
			}

			// Verify notification was pushed
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: `The repository ${mockRepo.name} was added successfully`
			});
		});
	});
});

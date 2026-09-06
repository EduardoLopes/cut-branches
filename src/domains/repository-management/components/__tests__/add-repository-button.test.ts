import type { MutationOptions } from '@tanstack/svelte-query';
import { open } from '@tauri-apps/plugin-dialog';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddButton from '../add-repository-button.svelte';
import { createCreateRepositoryMutation } from '$domains/repository-management/infrastructure/mutations/create-create-repository-mutation';
import { notifications } from '$services/notifications/notifications.svelte';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

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
	'$domains/repository-management/infrastructure/mutations/create-create-repository-mutation',
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
		it('renders correctly with default props', async () => {
			const screen = await renderWithTestWrapper(AddButton);
			expect(screen.getByText('Add a git repository')).toBeInTheDocument();
		});

		it('displays visually hidden label when visuallyHiddenLabel is true', async () => {
			const screen = await renderWithTestWrapper(AddButton, { visuallyHiddenLabel: true });
			const label = screen.getByText('Add a git repository');
			expect(label).toHaveClass('sr_true');
		});

		it('displays visible label when visuallyHiddenLabel is false', async () => {
			const screen = await renderWithTestWrapper(AddButton, { visuallyHiddenLabel: false });
			const label = screen.getByText('Add a git repository');
			expect(label).not.toHaveClass('sr_true');
		});
	});

	describe('Interactions', () => {
		it('calls open function on button click', async () => {
			const screen = await renderWithTestWrapper(AddButton);
			const button = screen.getByRole('button', { name: /add a git repository/i });
			await button.click();

			expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
		});

		it('calls mutation when directory is selected', async () => {
			vi.mocked(open).mockResolvedValue('/path/to/repo');

			const screen = await renderWithTestWrapper(AddButton);
			const button = screen.getByRole('button', { name: /add a git repository/i });
			await button.click();
			await tick();

			expect(mockMutate).toHaveBeenCalledWith({ path: '/path/to/repo' });
		});

		it('does not call mutation when directory selection is cancelled', async () => {
			vi.mocked(open).mockResolvedValue(null);

			const screen = await renderWithTestWrapper(AddButton);
			const button = screen.getByRole('button', { name: /add a git repository/i });
			await button.click();
			await tick();

			expect(mockMutate).not.toHaveBeenCalled();
		});

		it('shows error notification when directory selection fails', async () => {
			const mockError = new Error('Failed to open directory');
			vi.mocked(open).mockRejectedValue(mockError);

			const screen = await renderWithTestWrapper(AddButton);
			const button = screen.getByRole('button', { name: /add a git repository/i });
			await button.click();
			await tick();

			expect(notifications.push).toHaveBeenCalledWith({
				title: 'Error',
				message: mockError.message,
				feedback: 'danger'
			});
		});
	});

	describe('Repository Creation Success', () => {
		it('configures mutation with success callback', async () => {
			vi.mocked(open).mockResolvedValue('/path/to/new/repo');

			// Render component to trigger mutation creation
			await renderWithTestWrapper(AddButton);
			await tick();

			// Now verify the mutation was called with correct options
			expect(createCreateRepositoryMutation).toHaveBeenCalledWith({
				onSuccess: expect.any(Function),
				meta: { showErrorNotification: true }
			});

			// Get the stored mutation options and call onSuccess directly
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const options = (globalThis as any).__mutationOptions;
			if (options?.onSuccess) {
				options.onSuccess(mockDataFactory.repository(), undefined, undefined, undefined);
				await tick();
			}

			// Verify notification was pushed
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: `The repository ${mockDataFactory.repository().name} was added successfully`
			});
		});
	});
});

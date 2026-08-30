import { open } from '@tauri-apps/plugin-dialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAddRepository } from '../use-add-repository.svelte';
import { mockDataFactory } from '$utils/test-utils';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

const h = vi.hoisted(() => ({
	push: vi.fn(),
	mutate: vi.fn(),
	invalidate: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	options: undefined as any
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));

vi.mock('@tanstack/svelte-query', async (importActual) => ({
	...(await importActual<typeof import('@tanstack/svelte-query')>()),
	useQueryClient: () => ({ invalidateQueries: h.invalidate })
}));

vi.mock(
	'$domains/repository-management/infrastructure/mutations/create-create-repository-mutation',
	() => ({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		createCreateRepositoryMutation: vi.fn((options: any) => {
			h.options = options;
			return { mutate: h.mutate, isPending: false };
		})
	})
);

beforeEach(() => {
	vi.clearAllMocks();
	h.options = undefined;
	vi.mocked(open).mockResolvedValue('/path/to/repo');
});

describe('useAddRepository', () => {
	it('exposes the mutation pending state', () => {
		const addRepo = useAddRepository();
		expect(addRepo.isPending).toBe(false);
	});

	describe('addFromDialog', () => {
		it('opens the folder picker and mutates with the chosen path', async () => {
			const addRepo = useAddRepository();
			await addRepo.addFromDialog();

			expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
			expect(h.mutate).toHaveBeenCalledWith({ path: '/path/to/repo' });
		});

		it('does nothing when the picker is cancelled', async () => {
			vi.mocked(open).mockResolvedValue(null);

			const addRepo = useAddRepository();
			await addRepo.addFromDialog();

			expect(h.mutate).not.toHaveBeenCalled();
		});

		it('pushes a danger notification when the picker fails', async () => {
			vi.mocked(open).mockRejectedValue(new Error('boom'));

			const addRepo = useAddRepository();
			await addRepo.addFromDialog();

			expect(h.push).toHaveBeenCalledWith({
				title: 'Error',
				message: 'boom',
				feedback: 'danger'
			});
		});

		it('stringifies non-Error rejections', async () => {
			vi.mocked(open).mockRejectedValue('weird');

			const addRepo = useAddRepository();
			await addRepo.addFromDialog();

			expect(h.push).toHaveBeenCalledWith({
				title: 'Error',
				message: 'weird',
				feedback: 'danger'
			});
		});
	});

	describe('onSuccess handling', () => {
		it('notifies and calls the caller callback', () => {
			const onSuccess = vi.fn();
			useAddRepository({ onSuccess });

			const repo = mockDataFactory.repository();
			h.options.onSuccess(repo);

			// Invalidation is the global MutationCache's job (resource-keyed).
			expect(h.invalidate).not.toHaveBeenCalled();
			expect(h.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: `The repository ${repo.name} was added successfully`
			});
			expect(onSuccess).toHaveBeenCalledWith(repo);
		});

		it('does not notify when success data is missing', () => {
			const onSuccess = vi.fn();
			useAddRepository({ onSuccess });

			h.options.onSuccess(undefined);

			expect(h.push).not.toHaveBeenCalled();
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});
});

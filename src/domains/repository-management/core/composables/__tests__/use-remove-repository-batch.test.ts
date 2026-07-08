import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRemoveRepositoryBatch } from '../use-remove-repository-batch.svelte';

const h = vi.hoisted(() => ({
	push: vi.fn(),
	execute: vi.fn(),
	invalidateQueries: vi.fn(),
	removeQueries: vi.fn()
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));

vi.mock('@tanstack/svelte-query', async (importActual) => ({
	...(await importActual<typeof import('@tanstack/svelte-query')>()),
	useQueryClient: () => ({
		invalidateQueries: h.invalidateQueries,
		removeQueries: h.removeQueries
	})
}));

vi.mock('$infrastructure/tauri-commands', () => ({
	executeCommand: h.execute
}));

beforeEach(() => {
	vi.clearAllMocks();
	h.execute.mockResolvedValue({ success: true });
});

describe('useRemoveRepositoryBatch', () => {
	it('does nothing when given no ids', async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([]);

		expect(h.execute).not.toHaveBeenCalled();
		expect(h.invalidateQueries).not.toHaveBeenCalled();
		expect(h.push).not.toHaveBeenCalled();
	});

	it('removes each repository, invalidates the list once, and notifies success', async () => {
		const onComplete = vi.fn();
		const batch = useRemoveRepositoryBatch({ onComplete });

		await batch.removeBatch(['a', 'b']);

		expect(h.execute).toHaveBeenCalledTimes(2);
		expect(h.execute).toHaveBeenCalledWith('deleteRepository', { id: 'a' });
		expect(h.execute).toHaveBeenCalledWith('deleteRepository', { id: 'b' });
		expect(h.removeQueries).toHaveBeenCalledWith({
			queryKey: ['repository', 'getRepository', { id: 'a' }]
		});
		expect(h.invalidateQueries).toHaveBeenCalledExactlyOnceWith({
			queryKey: ['repository', 'getRepositoryList']
		});
		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'success', message: '2 repositories removed' })
		);
		expect(onComplete).toHaveBeenCalledWith({ removedIds: ['a', 'b'], failedIds: [] });
	});

	it('uses the singular noun when a single repository is removed', async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch(['solo']);

		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ message: '1 repository removed' })
		);
	});

	it('continues past a failure and reports both outcomes', async () => {
		const onComplete = vi.fn();
		h.execute
			.mockResolvedValueOnce({ success: true })
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ success: true });

		const batch = useRemoveRepositoryBatch({ onComplete });
		await batch.removeBatch(['a', 'b', 'c']);

		expect(h.execute).toHaveBeenCalledTimes(3);
		expect(h.invalidateQueries).toHaveBeenCalledOnce();
		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'success', message: '2 repositories removed' })
		);
		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', message: '1 repository failed to remove' })
		);
		expect(onComplete).toHaveBeenCalledWith({ removedIds: ['a', 'c'], failedIds: ['b'] });
	});

	it('skips list invalidation and success notice when every removal fails', async () => {
		h.execute.mockRejectedValue(new Error('boom'));

		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch(['a', 'b']);

		expect(h.invalidateQueries).not.toHaveBeenCalled();
		expect(h.push).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ feedback: 'danger', message: '2 repositories failed to remove' })
		);
	});

	it('ignores a second call while a batch is still running', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		h.execute.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));

		const batch = useRemoveRepositoryBatch();
		const first = batch.removeBatch(['a']);
		expect(batch.isPending).toBe(true);

		// Second call is a no-op while the first is in flight.
		await batch.removeBatch(['b']);
		expect(h.execute).toHaveBeenCalledTimes(1);

		resolveFirst({ success: true });
		await first;
		expect(batch.isPending).toBe(false);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRemoveRepositoryBatch } from '../use-remove-repository-batch.svelte';
import { getResource } from '$infrastructure/query-key-utils';

const h = vi.hoisted(() => ({
	push: vi.fn(),
	execute: vi.fn(),
	invalidateQueries: vi.fn(),
	removeQueries: vi.fn(),
	cancelQueries: vi.fn()
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));

vi.mock('@tanstack/svelte-query', async (importActual) => ({
	...(await importActual<typeof import('@tanstack/svelte-query')>()),
	useQueryClient: () => ({
		invalidateQueries: h.invalidateQueries,
		removeQueries: h.removeQueries,
		cancelQueries: h.cancelQueries
	})
}));

vi.mock('$infrastructure/tauri-commands', () => ({
	executeCommand: h.execute
}));

/** The resources a single `deleteRepository` mutation invalidates. */
const deleteResources = getResource('deleteRepository') as string[];

/** Runs every recorded invalidation predicate against a query key. */
function invalidatesKey(queryKey: unknown[]) {
	return h.invalidateQueries.mock.calls.some(([options]) => options.predicate({ queryKey }));
}

function target(id: string, name = id) {
	return { id, name };
}

beforeEach(() => {
	vi.clearAllMocks();
	h.execute.mockResolvedValue({ success: true });
});

describe('useRemoveRepositoryBatch', () => {
	it('does nothing when given no targets', async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([]);

		expect(h.execute).not.toHaveBeenCalled();
		expect(h.invalidateQueries).not.toHaveBeenCalled();
		expect(h.push).not.toHaveBeenCalled();
	});

	it('removes each repository, invalidates the mapped resources, and notifies success', async () => {
		const onComplete = vi.fn();
		const batch = useRemoveRepositoryBatch({ onComplete });

		await batch.removeBatch([target('a'), target('b')]);

		expect(h.execute).toHaveBeenCalledTimes(2);
		expect(h.execute).toHaveBeenCalledWith('deleteRepository', { id: 'a' });
		expect(h.execute).toHaveBeenCalledWith('deleteRepository', { id: 'b' });
		expect(h.removeQueries).toHaveBeenCalledWith({
			queryKey: ['repository', 'getRepository', { id: 'a' }]
		});
		// One invalidation per resource the single-remove mutation would have hit.
		expect(h.invalidateQueries).toHaveBeenCalledTimes(deleteResources.length);
		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'success', message: '2 repositories removed' })
		);
		expect(onComplete).toHaveBeenCalledWith({
			removedIds: ['a', 'b'],
			failedIds: [],
			failures: []
		});
	});

	it('invalidates the branch and diff caches the batch used to leave stale', async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([target('a')]);

		expect(invalidatesKey(['repository', 'getRepositoryList'])).toBe(true);
		expect(invalidatesKey(['branch', 'getBranchList', { repoId: 'a' }])).toBe(true);
		expect(invalidatesKey(['locked-branches', 'listLockedBranches'])).toBe(true);
		expect(invalidatesKey(['file-diff', 'getFileDiff'])).toBe(true);
		// Unrelated resources stay untouched.
		expect(invalidatesKey(['worktree', 'listWorktrees'])).toBe(false);
	});

	it('uses the singular noun when a single repository is removed', async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([target('solo')]);

		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ message: '1 repository removed' })
		);
	});

	it('continues past a failure and names each repository that could not be removed', async () => {
		const onComplete = vi.fn();
		h.execute
			.mockResolvedValueOnce({ success: true })
			.mockRejectedValueOnce(new Error('still in use'))
			.mockResolvedValueOnce({ success: true });

		const batch = useRemoveRepositoryBatch({ onComplete });
		await batch.removeBatch([target('a', 'alpha'), target('b', 'bravo'), target('c', 'charlie')]);

		expect(h.execute).toHaveBeenCalledTimes(3);
		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'success', message: '2 repositories removed' })
		);
		expect(h.push).toHaveBeenCalledWith({
			title: 'Some repositories could not be removed',
			message: '1 repository could not be removed:\n\n- `bravo` — still in use',
			feedback: 'danger'
		});
		expect(onComplete).toHaveBeenCalledWith({
			removedIds: ['a', 'c'],
			failedIds: ['b'],
			failures: [{ id: 'b', name: 'bravo', message: 'still in use' }]
		});
	});

	it('skips invalidation and the success notice when every removal fails', async () => {
		h.execute.mockRejectedValue(new Error('boom'));

		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([target('a', 'alpha'), target('b', 'bravo')]);

		expect(h.invalidateQueries).not.toHaveBeenCalled();
		expect(h.push).toHaveBeenCalledExactlyOnceWith({
			title: 'Some repositories could not be removed',
			message: '2 repositories could not be removed:\n\n- `alpha` — boom\n- `bravo` — boom',
			feedback: 'danger'
		});
	});

	it('falls back to a readable message for non-Error rejections', async () => {
		h.execute.mockRejectedValue('disk is read-only');

		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([target('a', 'alpha')]);

		expect(h.push).toHaveBeenCalledWith(
			expect.objectContaining({
				message: '1 repository could not be removed:\n\n- `alpha` — disk is read-only'
			})
		);
	});

	it('ignores a second call while a batch is still running', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		h.execute.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));

		const batch = useRemoveRepositoryBatch();
		const first = batch.removeBatch([target('a')]);
		expect(batch.isPending).toBe(true);

		// Second call is a no-op while the first is in flight.
		await batch.removeBatch([target('b')]);
		expect(h.execute).toHaveBeenCalledTimes(1);

		resolveFirst({ success: true });
		await first;
		expect(batch.isPending).toBe(false);
	});
	it("cancels the removed repository's in-flight detail query before dropping it", async () => {
		const batch = useRemoveRepositoryBatch();
		await batch.removeBatch([target('a')]);

		// Cancel first: a request already in flight would write the repository
		// straight back into the cache we just emptied.
		expect(h.cancelQueries).toHaveBeenCalledWith({
			queryKey: ['repository', 'getRepository', { id: 'a' }]
		});
		expect(h.cancelQueries.mock.invocationCallOrder[0]).toBeLessThan(
			h.removeQueries.mock.invocationCallOrder[0]
		);
	});

	it('reports the result before invalidating the removed repositories', async () => {
		const order: string[] = [];
		h.invalidateQueries.mockImplementation(() => {
			order.push('invalidate');
			return Promise.resolve();
		});
		const batch = useRemoveRepositoryBatch({ onComplete: () => order.push('complete') });

		await batch.removeBatch([target('a')]);

		// The caller navigates away in onComplete; invalidating first would refetch
		// the branch lists and metrics of a repository that is already gone.
		expect(order[0]).toBe('complete');
		expect(order).toContain('invalidate');
	});

	it('does not invalidate when every removal failed', async () => {
		h.execute.mockRejectedValue(new Error('nope'));
		const onComplete = vi.fn();
		const batch = useRemoveRepositoryBatch({ onComplete });

		await batch.removeBatch([target('a')]);

		expect(h.invalidateQueries).not.toHaveBeenCalled();
		expect(onComplete).toHaveBeenCalledWith(
			expect.objectContaining({ removedIds: [], failedIds: ['a'] })
		);
	});
});

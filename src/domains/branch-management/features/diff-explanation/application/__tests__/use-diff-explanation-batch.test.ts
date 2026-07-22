import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useDiffExplanationBatch } from '../use-diff-explanation-batch.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { batchMutate, cancelMutate, listen, unlisten, holder } = vi.hoisted(() => ({
	batchMutate: vi.fn(),
	cancelMutate: vi.fn(),
	listen: vi.fn(),
	unlisten: vi.fn(),
	holder: { pending: false }
}));

vi.mock('@tauri-apps/api/event', () => ({ listen }));
vi.mock('../../infrastructure/mutations/create-diff-explanation-batch-mutation', () => ({
	createDiffExplanationBatchMutation: () => ({
		mutateAsync: batchMutate,
		get isPending() {
			return holder.pending;
		}
	})
}));
vi.mock('../../infrastructure/mutations/create-cancel-explanation-mutation', () => ({
	createCancelExplanationMutation: () => ({ mutateAsync: cancelMutate })
}));

const options = {
	getPath: () => '/repo',
	getBranchName: () => null,
	getCommitSha: () => 'abcdef1'
};

const handlers: Record<string, (event: { payload: unknown }) => void> = {};

beforeEach(() => {
	batchMutate.mockReset();
	cancelMutate.mockReset();
	unlisten.mockReset();
	holder.pending = false;
	for (const key of Object.keys(handlers)) delete handlers[key];
	listen.mockReset();
	listen.mockImplementation((name: string, handler: (event: { payload: unknown }) => void) => {
		handlers[name] = handler;
		return Promise.resolve(unlisten);
	});
});

describe('useDiffExplanationBatch', () => {
	test('starts empty', () => {
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		expect(value.done).toBe(0);
		expect(value.total).toBe(0);
		expect(value.error).toBeNull();
		expect(value.cancelled).toBe(false);
		expect(value.isRunning).toBe(false);
		expect(value.get('a.ts')).toBeUndefined();
		cleanup();
	});

	test('multiplexes chunk/completed/progress events into per-file state', async () => {
		let resolve!: (v: unknown) => void;
		batchMutate.mockImplementation(() => new Promise((r) => (resolve = r)));

		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		const done = value.generate(['a.ts', 'b.ts']);
		await vi.waitFor(() => expect(batchMutate).toHaveBeenCalled());

		const batchId = batchMutate.mock.calls[0][0].batchId;
		expect(batchMutate.mock.calls[0][0]).toMatchObject({
			path: '/repo',
			branchName: null,
			commitSha: 'abcdef1',
			filePaths: ['a.ts', 'b.ts'],
			style: 'succinct'
		});
		expect(value.total).toBe(2);

		// Streaming chunks accumulate on the right file.
		handlers['explanation-chunk']({
			payload: { requestId: batchId, filePath: 'a.ts', delta: 'Ex' }
		});
		handlers['explanation-chunk']({
			payload: { requestId: batchId, filePath: 'a.ts', delta: 'pl' }
		});
		expect(value.get('a.ts')).toEqual({ text: 'Expl', status: 'streaming' });

		// Events for a different batch are ignored.
		handlers['explanation-chunk']({ payload: { requestId: 'nope', filePath: 'a.ts', delta: 'Z' } });
		handlers['explanation-file-completed']({
			payload: { requestId: 'nope', filePath: 'a.ts', text: 'no', error: null }
		});
		handlers['explanation-batch-progress']({ payload: { batchId: 'nope', done: 9, total: 9 } });
		expect(value.get('a.ts')?.text).toBe('Expl');
		expect(value.done).toBe(0);

		// Completion overwrites with the authoritative text.
		handlers['explanation-file-completed']({
			payload: { requestId: batchId, filePath: 'a.ts', text: 'Explained fully.', error: null }
		});
		expect(value.get('a.ts')).toEqual({
			text: 'Explained fully.',
			status: 'done',
			error: undefined
		});

		// A failed file records the error.
		handlers['explanation-file-completed']({
			payload: { requestId: batchId, filePath: 'b.ts', text: '', error: 'agent boom' }
		});
		expect(value.get('b.ts')).toEqual({ text: '', status: 'error', error: 'agent boom' });

		handlers['explanation-batch-progress']({ payload: { batchId, done: 2, total: 2 } });
		expect(value.done).toBe(2);

		resolve({ batchId, total: 2 });
		await done;
		expect(value.total).toBe(2);
		expect(unlisten).toHaveBeenCalledTimes(3);
		cleanup();
	});

	test('forwards the chosen explanation style', async () => {
		batchMutate.mockResolvedValue({ batchId: 'b', total: 1 });
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate(['a.ts'], 'plainLanguage');
		expect(batchMutate.mock.calls[0][0].style).toBe('plainLanguage');
		cleanup();
	});

	test('derives total from the changeset when no files are named', async () => {
		batchMutate.mockResolvedValue({ batchId: 'b', total: 5 });
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate();
		expect(batchMutate.mock.calls[0][0].filePaths).toBeNull();
		expect(value.total).toBe(5);
		cleanup();
	});

	test('records a non-cancellation error', async () => {
		batchMutate.mockRejectedValue({ kind: 'agent_failed', message: 'boom' });
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate(['a.ts']);
		expect(value.error).toBe('boom');
		expect(value.cancelled).toBe(false);
		cleanup();
	});

	test('uses a default message for an opaque rejection', async () => {
		batchMutate.mockRejectedValue({});
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate(['a.ts']);
		expect(value.error).toBe('Explanation failed');
		cleanup();
	});

	test('marks cancellation without an error', async () => {
		batchMutate.mockRejectedValue({ kind: 'explanation_cancelled' });
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate(['a.ts']);
		expect(value.cancelled).toBe(true);
		expect(value.error).toBeNull();
		cleanup();
	});

	test('degrades gracefully when listen rejects', async () => {
		listen.mockRejectedValue(new Error('no runtime'));
		batchMutate.mockResolvedValue({ batchId: 'b', total: 1 });
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		await value.generate(['a.ts']);
		expect(value.total).toBe(1);
		expect(unlisten).not.toHaveBeenCalled();
		cleanup();
	});

	test('proxies isRunning to the mutation pending state', () => {
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		holder.pending = true;
		expect(value.isRunning).toBe(true);
		cleanup();
	});

	test('cancel calls the cancel command with the batch id', async () => {
		cancelMutate.mockResolvedValue({ cancelled: true });
		batchMutate.mockImplementation(() => new Promise(() => {}));
		const { value, cleanup } = withEffectRoot(() => useDiffExplanationBatch(options));
		value.generate(['a.ts']);
		await vi.waitFor(() => expect(batchMutate).toHaveBeenCalled());
		const batchId = batchMutate.mock.calls[0][0].batchId;
		await value.cancel();
		expect(cancelMutate).toHaveBeenCalledWith({ id: batchId });
		cleanup();
	});
});

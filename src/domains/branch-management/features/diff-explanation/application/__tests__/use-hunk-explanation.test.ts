import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useHunkExplanation } from '../use-hunk-explanation.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { hunkMutate, cancelMutate, listen, unlisten, holder } = vi.hoisted(() => ({
	hunkMutate: vi.fn(),
	cancelMutate: vi.fn(),
	listen: vi.fn(),
	unlisten: vi.fn(),
	holder: { pending: false }
}));

vi.mock('@tauri-apps/api/event', () => ({ listen }));
vi.mock('../../infrastructure/mutations/create-hunk-explanation-mutation', () => ({
	createHunkExplanationMutation: () => ({
		mutateAsync: hunkMutate,
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
	getBranchName: () => 'feature/x',
	getCommitSha: () => null
};

let chunkHandler: (event: { payload: unknown }) => void;

beforeEach(() => {
	hunkMutate.mockReset();
	cancelMutate.mockReset();
	unlisten.mockReset();
	holder.pending = false;
	listen.mockReset();
	listen.mockImplementation((_name: string, handler: typeof chunkHandler) => {
		chunkHandler = handler;
		return Promise.resolve(unlisten);
	});
});

describe('useHunkExplanation', () => {
	test('starts empty', () => {
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		expect(value.text).toBe('');
		expect(value.hunks).toEqual([]);
		expect(value.error).toBeNull();
		expect(value.hasRun).toBe(false);
		cleanup();
	});

	test('parses streamed markers into hunks, then labels them with headers', async () => {
		let resolve!: (v: unknown) => void;
		hunkMutate.mockImplementation(() => new Promise((r) => (resolve = r)));

		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		const done = value.explain('a.ts', null, 'succinct');
		await vi.waitFor(() => expect(hunkMutate).toHaveBeenCalled());

		const requestId = hunkMutate.mock.calls[0][0].requestId;
		expect(hunkMutate.mock.calls[0][0]).toMatchObject({
			path: '/repo',
			branchName: 'feature/x',
			commitSha: null,
			filePath: 'a.ts',
			oldPath: null,
			style: 'succinct'
		});

		// Stream two marker-delimited sections; headers not known mid-stream.
		chunkHandler({ payload: { requestId, filePath: 'a.ts', delta: '@@HUNK 1@@\nFirst.' } });
		chunkHandler({ payload: { requestId, filePath: 'a.ts', delta: '\n@@HUNK 2@@\nSecond.' } });
		expect(value.hunks).toEqual([
			{ index: 1, header: undefined, text: 'First.' },
			{ index: 2, header: undefined, text: 'Second.' }
		]);

		// A stray event for another request is ignored.
		chunkHandler({ payload: { requestId: 'other', filePath: 'a.ts', delta: 'x' } });
		expect(value.hunks).toHaveLength(2);

		resolve({
			requestId,
			filePath: 'a.ts',
			text: '@@HUNK 1@@\nFirst.\n@@HUNK 2@@\nSecond.',
			hunkHeaders: ['@@ -1 +1 @@', '@@ -9 +9 @@']
		});
		await done;

		expect(value.hunks).toEqual([
			{ index: 1, header: '@@ -1 +1 @@', text: 'First.' },
			{ index: 2, header: '@@ -9 +9 @@', text: 'Second.' }
		]);
		expect(unlisten).toHaveBeenCalled();
		cleanup();
	});

	test('handles a hunkless file (no markers, empty headers)', async () => {
		hunkMutate.mockResolvedValue({
			requestId: 'r',
			filePath: 'a.ts',
			text: '',
			hunkHeaders: []
		});
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		await value.explain('a.ts');
		expect(value.hunks).toEqual([]);
		expect(value.text).toBe('');
		cleanup();
	});

	test('records a non-cancellation error', async () => {
		hunkMutate.mockRejectedValue({ kind: 'agent_failed', message: 'boom', description: 'stderr' });
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('stderr');
		cleanup();
	});

	test('uses a default message for an opaque rejection', async () => {
		hunkMutate.mockRejectedValue({});
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('Explanation failed');
		cleanup();
	});

	test('marks cancellation without an error', async () => {
		hunkMutate.mockRejectedValue({ kind: 'explanation_cancelled' });
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		await value.explain('a.ts');
		expect(value.cancelled).toBe(true);
		expect(value.error).toBeNull();
		cleanup();
	});

	test('degrades gracefully when listen rejects', async () => {
		listen.mockRejectedValue(new Error('no runtime'));
		hunkMutate.mockResolvedValue({
			requestId: 'r',
			filePath: 'a.ts',
			text: '@@HUNK 1@@\nOnly.',
			hunkHeaders: ['@@ -1 +1 @@']
		});
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		await value.explain('a.ts');
		expect(value.hunks).toEqual([{ index: 1, header: '@@ -1 +1 @@', text: 'Only.' }]);
		expect(unlisten).not.toHaveBeenCalled();
		cleanup();
	});

	test('proxies isStreaming and cancels by request id', async () => {
		cancelMutate.mockResolvedValue({ cancelled: true });
		hunkMutate.mockImplementation(() => new Promise(() => {}));
		const { value, cleanup } = withEffectRoot(() => useHunkExplanation(options));
		value.explain('a.ts');
		await vi.waitFor(() => expect(hunkMutate).toHaveBeenCalled());
		holder.pending = true;
		expect(value.isStreaming).toBe(true);
		const requestId = hunkMutate.mock.calls[0][0].requestId;
		await value.cancel();
		expect(cancelMutate).toHaveBeenCalledWith({ id: requestId });
		cleanup();
	});
});

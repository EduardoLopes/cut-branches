import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useFileExplanation } from '../use-file-explanation.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { fileMutate, cancelMutate, listen, unlisten, holder } = vi.hoisted(() => ({
	fileMutate: vi.fn(),
	cancelMutate: vi.fn(),
	listen: vi.fn(),
	unlisten: vi.fn(),
	holder: { pending: false }
}));

vi.mock('@tauri-apps/api/event', () => ({ listen }));
vi.mock('../../infrastructure/mutations/create-file-explanation-mutation', () => ({
	createFileExplanationMutation: () => ({
		mutateAsync: fileMutate,
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

/** Captures the `explanation-chunk` handler the composable registers. */
let chunkHandler: (event: { payload: unknown }) => void;

beforeEach(() => {
	fileMutate.mockReset();
	cancelMutate.mockReset();
	unlisten.mockReset();
	holder.pending = false;
	listen.mockReset();
	listen.mockImplementation((_name: string, handler: typeof chunkHandler) => {
		chunkHandler = handler;
		return Promise.resolve(unlisten);
	});
});

describe('useFileExplanation', () => {
	test('starts idle', () => {
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		expect(value.text).toBe('');
		expect(value.error).toBeNull();
		expect(value.hasRun).toBe(false);
		expect(value.cancelled).toBe(false);
		expect(value.isStreaming).toBe(false);
		cleanup();
	});

	test('streams chunks matching request + file, then reconciles with return value', async () => {
		let resolve!: (v: unknown) => void;
		fileMutate.mockImplementation(() => new Promise((r) => (resolve = r)));

		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		const done = value.explain('a.ts');
		await vi.waitFor(() => expect(fileMutate).toHaveBeenCalled());

		const requestId = fileMutate.mock.calls[0][0].requestId;
		expect(fileMutate.mock.calls[0][0]).toMatchObject({
			path: '/repo',
			branchName: 'feature/x',
			commitSha: null,
			filePath: 'a.ts',
			oldPath: null,
			// Defaults to succinct when no style is passed.
			style: 'succinct'
		});

		chunkHandler({ payload: { requestId, filePath: 'a.ts', delta: 'Hel' } });
		chunkHandler({ payload: { requestId, filePath: 'a.ts', delta: 'lo' } });
		expect(value.text).toBe('Hello');

		// Chunks for a different request or file are ignored.
		chunkHandler({ payload: { requestId: 'other', filePath: 'a.ts', delta: 'X' } });
		chunkHandler({ payload: { requestId, filePath: 'b.ts', delta: 'Y' } });
		expect(value.text).toBe('Hello');

		resolve({ requestId, filePath: 'a.ts', text: 'Hello, world.' });
		await done;
		expect(value.text).toBe('Hello, world.');
		expect(value.hasRun).toBe(true);
		expect(unlisten).toHaveBeenCalled();
		cleanup();
	});

	test('forwards the chosen explanation style', async () => {
		fileMutate.mockResolvedValue({ requestId: 'r', filePath: 'a.ts', text: 'x' });
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts', null, 'reviewFocused');
		expect(fileMutate.mock.calls[0][0].style).toBe('reviewFocused');
		cleanup();
	});

	test('proxies isStreaming to the mutation pending state', () => {
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		holder.pending = true;
		expect(value.isStreaming).toBe(true);
		cleanup();
	});

	test('records a non-cancellation error', async () => {
		fileMutate.mockRejectedValue({ kind: 'agent_failed', message: 'boom', description: 'stderr' });
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('stderr');
		expect(value.cancelled).toBe(false);
		cleanup();
	});

	test('falls back to message when description is absent', async () => {
		fileMutate.mockRejectedValue({ kind: 'agent_failed', message: 'only-message' });
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('only-message');
		cleanup();
	});

	test('uses a default message for an opaque rejection', async () => {
		fileMutate.mockRejectedValue({});
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('Explanation failed');
		cleanup();
	});

	test('marks cancellation without setting an error', async () => {
		fileMutate.mockRejectedValue({
			kind: 'explanation_cancelled',
			message: 'Explanation cancelled'
		});
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.cancelled).toBe(true);
		expect(value.error).toBeNull();
		cleanup();
	});

	test('degrades gracefully when listen rejects (no Tauri runtime)', async () => {
		listen.mockRejectedValue(new Error('no runtime'));
		fileMutate.mockResolvedValue({ requestId: 'r', filePath: 'a.ts', text: 'FULL' });
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.text).toBe('FULL');
		expect(unlisten).not.toHaveBeenCalled();
		cleanup();
	});

	test('explain resets prior text and error state', async () => {
		fileMutate.mockRejectedValueOnce({ kind: 'agent_failed', message: 'first' });
		fileMutate.mockResolvedValueOnce({ requestId: 'r', filePath: 'a.ts', text: 'second' });
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		await value.explain('a.ts');
		expect(value.error).toBe('first');
		await value.explain('a.ts');
		expect(value.error).toBeNull();
		expect(value.text).toBe('second');
		cleanup();
	});

	test('cancel calls the cancel command with the request id', async () => {
		cancelMutate.mockResolvedValue({ cancelled: true });
		fileMutate.mockImplementation(() => new Promise(() => {}));
		const { value, cleanup } = withEffectRoot(() => useFileExplanation(options));
		value.explain('a.ts');
		await vi.waitFor(() => expect(fileMutate).toHaveBeenCalled());
		const requestId = fileMutate.mock.calls[0][0].requestId;
		await value.cancel();
		expect(cancelMutate).toHaveBeenCalledWith({ id: requestId });
		cleanup();
	});
});

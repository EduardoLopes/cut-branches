import { flushSync } from 'svelte';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRepositoryWatch } from '../use-repository-watch.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

// Track every effect root so a test that throws before its own cleanup() still
// gets disposed here — otherwise a leaked focus listener contaminates later tests.
const roots: Array<() => void> = [];
function mountWatch(getId: () => string) {
	const { value, cleanup } = withEffectRoot(() => useRepositoryWatch(getId));
	let disposed = false;
	const safeCleanup = () => {
		if (disposed) return;
		disposed = true;
		cleanup();
	};
	roots.push(safeCleanup);
	return { value, cleanup: safeCleanup };
}

// Backend command.
const mockSyncStatus = vi.fn();
vi.mock('$infrastructure/bindings', () => ({
	commands: {
		getRepositorySyncStatus: (input: unknown) => mockSyncStatus(input)
	}
}));

// Query client.
const mockInvalidateQueries = vi.fn(() => Promise.resolve());
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries })
	};
});

const REPO_ID = 'test-repo-id';
const ok = (drifted: boolean) => ({ status: 'ok', data: { drifted } });

/** Resolve queued microtasks so awaited command promises settle. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	mockSyncStatus.mockReset();
	mockSyncStatus.mockResolvedValue(ok(false));
	mockInvalidateQueries.mockClear();
});

afterEach(() => {
	while (roots.length) roots.pop()?.();
});

describe('useRepositoryWatch', () => {
	test('checks sync status on mount and stays in sync when not drifted', async () => {
		const { value, cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();

		expect(mockSyncStatus).toHaveBeenCalledWith({ repositoryId: REPO_ID });
		expect(value.outOfSync).toBe(false);
		expect(mockInvalidateQueries).not.toHaveBeenCalled();
		cleanup();
	});

	test('does nothing when repository id is empty', async () => {
		const { value, cleanup } = mountWatch(() => '');
		flushSync();
		await flushMicrotasks();

		expect(mockSyncStatus).not.toHaveBeenCalled();
		expect(value.outOfSync).toBe(false);
		cleanup();
	});

	test('heals silently and clears outOfSync when drift resolves', async () => {
		// First check drifted, recheck after heal is clean.
		mockSyncStatus.mockResolvedValueOnce(ok(true)).mockResolvedValueOnce(ok(false));
		const { value, cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();

		expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
		expect(mockSyncStatus).toHaveBeenCalledTimes(2); // initial + recheck
		expect(value.outOfSync).toBe(false);
		cleanup();
	});

	test('keeps outOfSync true when the heal did not resolve drift', async () => {
		mockSyncStatus.mockResolvedValue(ok(true)); // stays drifted even after heal
		const { value, cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();

		expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
		expect(value.outOfSync).toBe(true);
		cleanup();
	});

	test('re-checks on window focus', async () => {
		const { cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();
		mockSyncStatus.mockClear();

		window.dispatchEvent(new Event('focus'));
		await flushMicrotasks();

		expect(mockSyncStatus).toHaveBeenCalledWith({ repositoryId: REPO_ID });
		cleanup();
	});

	test('skips the check while the document is hidden', async () => {
		const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		try {
			const { cleanup } = mountWatch(() => REPO_ID);
			flushSync();
			await flushMicrotasks();
			mockSyncStatus.mockClear();

			window.dispatchEvent(new Event('focus'));
			await flushMicrotasks();

			expect(mockSyncStatus).not.toHaveBeenCalled();
			cleanup();
		} finally {
			spy.mockRestore();
		}
	});

	test('ignores a failed status check', async () => {
		mockSyncStatus.mockResolvedValue({ status: 'error', error: { message: 'boom' } });
		const { value, cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();

		expect(mockInvalidateQueries).not.toHaveBeenCalled();
		expect(value.outOfSync).toBe(false);
		cleanup();
	});

	test('refresh() invalidates and re-checks', async () => {
		const { value, cleanup } = mountWatch(() => REPO_ID);
		flushSync();
		await flushMicrotasks();
		mockInvalidateQueries.mockClear();
		mockSyncStatus.mockClear();

		await value.refresh();

		expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
		expect(mockSyncStatus).toHaveBeenCalledWith({ repositoryId: REPO_ID });
		cleanup();
	});

	test('a check for the previous repository cannot flag the new one', async () => {
		// The first check hangs; by the time it answers "drifted", the user has
		// already switched to another repository.
		let answerFirst!: (status: unknown) => void;
		mockSyncStatus.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					answerFirst = resolve;
				})
		);

		let activeId = 'repo-a';
		const { value, cleanup } = mountWatch(() => activeId);
		flushSync();
		await flushMicrotasks();

		// Repository B becomes active and checks out clean.
		activeId = 'repo-b';
		mockSyncStatus.mockResolvedValue(ok(false));
		await value.refresh();
		expect(mockSyncStatus).toHaveBeenLastCalledWith({ repositoryId: 'repo-b' });
		expect(value.outOfSync).toBe(false);

		// Repository A's stale verdict arrives last and must be ignored.
		answerFirst(ok(true));
		await flushMicrotasks();

		expect(value.outOfSync).toBe(false);
		cleanup();
	});

	test('refresh() is a no-op without a repository id', async () => {
		const { value, cleanup } = mountWatch(() => '');
		flushSync();
		await flushMicrotasks();
		mockInvalidateQueries.mockClear();

		await value.refresh();

		expect(mockInvalidateQueries).not.toHaveBeenCalled();
		cleanup();
	});
});

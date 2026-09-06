import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTauriInfiniteQuery } from '../create-tauri-infinite-query';

const { holder, invalidateQueries, executor } = vi.hoisted(() => ({
	holder: { options: null as null | (() => Record<string, unknown>) },
	invalidateQueries: vi.fn(),
	executor: vi.fn(async (input?: unknown) => ({ echoed: input }))
}));

vi.mock('@tanstack/svelte-query', () => ({
	createInfiniteQuery: (options: () => Record<string, unknown>) => {
		holder.options = options;
		return { subscribe: vi.fn() };
	},
	// Imported by the sibling create-tauri-query module (same module graph).
	createQuery: vi.fn(),
	useQueryClient: () => ({ invalidateQueries })
}));

vi.mock('../tauri-commands', () => ({
	buildCommandExecutor: vi.fn(() => executor)
}));

type Options = {
	queryKey: unknown[];
	queryFn: (ctx: { pageParam: unknown }) => Promise<unknown>;
	meta: { invalidate: () => unknown };
	staleTime?: number;
	initialPageParam?: unknown;
};

const resolve = (): Options => {
	if (!holder.options) throw new Error('createInfiniteQuery not called');
	return holder.options() as Options;
};

beforeEach(() => {
	holder.options = null;
	invalidateQueries.mockClear();
	executor.mockClear();
});

describe('createTauriInfiniteQuery', () => {
	it('derives the resource-based query key from the base input', () => {
		createTauriInfiniteQuery('listCommitHistory', {
			input: () => ({ path: '/repo', limit: 10 }),
			withPageParam: (base, cursor) => ({ ...base, cursor: cursor ?? undefined }),
			initialPageParam: null as string | null,
			getNextPageParam: () => undefined
		});

		expect(resolve().queryKey).toEqual([
			'commit-history',
			'listCommitHistory',
			{ path: '/repo', limit: 10 }
		]);
	});

	it('accepts an explicit query key thunk that tracks its inputs', () => {
		let repoId = 'r1';
		createTauriInfiniteQuery('listCommitHistory', {
			queryKey: () => ['commit-history', 'listCommitHistory', { repoId, path: '/repo' }],
			input: () => ({ path: '/repo', limit: 10 }),
			withPageParam: (base, cursor) => ({ ...base, cursor: cursor ?? undefined }),
			initialPageParam: null as string | null,
			getNextPageParam: () => undefined
		});

		expect(resolve().queryKey[2]).toEqual({ repoId: 'r1', path: '/repo' });
		repoId = 'r2';
		expect(resolve().queryKey[2]).toEqual({ repoId: 'r2', path: '/repo' });
	});

	it('threads the page param into the command input via withPageParam', async () => {
		createTauriInfiniteQuery('listCommitHistory', {
			input: () => ({ path: '/repo', limit: 10 }),
			withPageParam: (base, cursor) =>
				cursor === null ? base : { ...base, cursor: cursor as string },
			initialPageParam: null,
			getNextPageParam: () => undefined
		});

		await resolve().queryFn({ pageParam: null });
		expect(executor).toHaveBeenLastCalledWith({ path: '/repo', limit: 10 });

		await resolve().queryFn({ pageParam: 'abc:200' });
		expect(executor).toHaveBeenLastCalledWith({ path: '/repo', limit: 10, cursor: 'abc:200' });
	});

	it('executes without input when none is configured', async () => {
		createTauriInfiniteQuery('listCommitHistory', {
			withPageParam: (base) => base,
			initialPageParam: null,
			getNextPageParam: () => undefined
		});

		await resolve().queryFn({ pageParam: 'ignored' });
		expect(executor).toHaveBeenLastCalledWith(undefined);
	});

	it('exposes an invalidate helper bound to the resolved key', () => {
		createTauriInfiniteQuery('listCommitHistory', {
			queryKey: ['commit-history', 'listCommitHistory', { repoId: 'r1' }],
			input: () => ({ path: '/repo', limit: 10 }),
			withPageParam: (base) => base,
			initialPageParam: null,
			getNextPageParam: () => undefined
		});

		resolve().meta.invalidate();
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ['commit-history', 'listCommitHistory', { repoId: 'r1' }]
		});
	});

	it('passes remaining options through to createInfiniteQuery', () => {
		createTauriInfiniteQuery('listCommitHistory', {
			input: () => ({ path: '/repo', limit: 10 }),
			withPageParam: (base) => base,
			initialPageParam: null,
			getNextPageParam: () => undefined,
			staleTime: 1234
		});

		const options = resolve();
		expect(options.staleTime).toBe(1234);
		expect(options.initialPageParam).toBeNull();
	});
});

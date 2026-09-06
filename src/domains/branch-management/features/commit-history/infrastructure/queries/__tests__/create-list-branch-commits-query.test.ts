import type { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	BRANCH_COMMITS_PAGE_SIZE,
	createListBranchCommitsQuery,
	prefetchBranchCommits
} from '../create-list-branch-commits-query';

const { createTauriQuery, prefetchTauriQuery } = vi.hoisted(() => ({
	createTauriQuery: vi.fn((_command: string, _config: unknown) => ({ isLoading: false })),
	prefetchTauriQuery: vi.fn(async () => undefined)
}));

vi.mock('$infrastructure/create-tauri-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$infrastructure/create-tauri-query')>();
	return { ...actual, createTauriQuery, prefetchTauriQuery };
});

type Config = {
	input: () => unknown;
	queryKey: () => unknown;
	enabled: () => boolean;
};

function lastConfig(): Config {
	return createTauriQuery.mock.calls.at(-1)?.[1] as unknown as Config;
}

const baseInput = { repoId: 'repo-1', path: '/repo', branch: 'feature/x' };

const expectedWireInput = {
	path: '/repo',
	branch: 'feature/x',
	limit: BRANCH_COMMITS_PAGE_SIZE
};

const expectedKey = [
	'branch-commits',
	'listBranchCommits',
	{ repoId: 'repo-1', ...expectedWireInput }
];

beforeEach(() => {
	createTauriQuery.mockClear();
	prefetchTauriQuery.mockClear();
});

describe('createListBranchCommitsQuery', () => {
	it('keys by repo + wire input and defaults the page size', () => {
		createListBranchCommitsQuery(() => baseInput);

		expect(lastConfig().queryKey()).toEqual(expectedKey);
		expect(lastConfig().input()).toEqual(expectedWireInput);
	});

	it('honours an explicit limit', () => {
		createListBranchCommitsQuery(() => ({ ...baseInput, limit: 3 }));

		expect(lastConfig().input()).toEqual({ ...expectedWireInput, limit: 3 });
	});

	it('stays disabled until both path and branch are known', () => {
		createListBranchCommitsQuery(() => baseInput);
		expect(lastConfig().enabled()).toBe(true);

		createListBranchCommitsQuery(() => ({ ...baseInput, path: '' }));
		expect(lastConfig().enabled()).toBe(false);

		createListBranchCommitsQuery(() => ({ ...baseInput, branch: '' }));
		expect(lastConfig().enabled()).toBe(false);
	});
});

describe('prefetchBranchCommits', () => {
	const queryClient = {} as QueryClient;

	it('warms exactly the key the disclosure will observe', () => {
		createListBranchCommitsQuery(() => baseInput);
		prefetchBranchCommits(queryClient, baseInput);

		expect(prefetchTauriQuery).toHaveBeenCalledWith(
			queryClient,
			'listBranchCommits',
			expect.objectContaining({ queryKey: expectedKey, input: expectedWireInput })
		);
		// The whole point of sharing the config helper: the warmed key and the
		// observed key cannot drift.
		const warmed = prefetchTauriQuery.mock.calls.at(-1) as unknown as [
			unknown,
			string,
			{ queryKey: unknown }
		];
		expect(warmed[2].queryKey).toEqual(lastConfig().queryKey());
	});

	it('is a no-op for an input the query itself would refuse to run', () => {
		prefetchBranchCommits(queryClient, { ...baseInput, path: '' });
		prefetchBranchCommits(queryClient, { ...baseInput, branch: '' });

		expect(prefetchTauriQuery).not.toHaveBeenCalled();
	});
});

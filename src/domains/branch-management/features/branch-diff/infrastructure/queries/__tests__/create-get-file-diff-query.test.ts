import type { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createGetFileDiffQuery, prefetchFileDiff } from '../create-get-file-diff-query';

const { createTauriQuery, prefetchTauriQuery } = vi.hoisted(() => ({
	createTauriQuery: vi.fn((_command: string, _config: unknown) => ({ isLoading: false })),
	prefetchTauriQuery: vi.fn(async () => undefined)
}));

vi.mock('$infrastructure/create-tauri-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$infrastructure/create-tauri-query')>();
	return { ...actual, createTauriQuery, prefetchTauriQuery };
});

type Config = { input: unknown; enabled: () => boolean };

function lastConfig(): Config {
	return createTauriQuery.mock.calls.at(-1)?.[1] as unknown as Config;
}

beforeEach(() => {
	createTauriQuery.mockClear();
	prefetchTauriQuery.mockClear();
});

const baseInput = {
	path: '/repo',
	branchName: 'feature/x',
	commitSha: null,
	filePath: 'src/app.ts',
	oldPath: null
};

describe('createGetFileDiffQuery', () => {
	it('wraps the getFileDiff command with the given input', () => {
		createGetFileDiffQuery(baseInput);

		expect(createTauriQuery).toHaveBeenCalledWith(
			'getFileDiff',
			expect.objectContaining({ input: baseInput })
		);
	});

	it('is enabled once path, target, and file are all present', () => {
		createGetFileDiffQuery(baseInput);
		expect(lastConfig().enabled()).toBe(true);

		createGetFileDiffQuery({ ...baseInput, branchName: null, commitSha: 'abc1234' });
		expect(lastConfig().enabled()).toBe(true);
	});

	it('stays disabled while any required piece is missing', () => {
		createGetFileDiffQuery({ ...baseInput, path: '' });
		expect(lastConfig().enabled()).toBe(false);

		createGetFileDiffQuery({ ...baseInput, filePath: '' });
		expect(lastConfig().enabled()).toBe(false);

		createGetFileDiffQuery({ ...baseInput, branchName: null });
		expect(lastConfig().enabled()).toBe(false);
	});

	it('resolves function inputs when computing enabled', () => {
		createGetFileDiffQuery(() => baseInput);
		expect(lastConfig().enabled()).toBe(true);
	});
});

describe('prefetchFileDiff', () => {
	const queryClient = {} as QueryClient;

	it('warms the same input the panel will observe', () => {
		prefetchFileDiff(queryClient, baseInput);

		expect(prefetchTauriQuery).toHaveBeenCalledWith(queryClient, 'getFileDiff', {
			input: baseInput
		});
	});

	it('is a no-op for an input the query itself would refuse to run', () => {
		prefetchFileDiff(queryClient, { ...baseInput, path: '' });
		prefetchFileDiff(queryClient, { ...baseInput, filePath: '' });
		prefetchFileDiff(queryClient, { ...baseInput, branchName: null });

		expect(prefetchTauriQuery).not.toHaveBeenCalled();
	});
});

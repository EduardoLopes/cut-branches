import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createGetFileDiffQuery } from '../create-get-file-diff-query';

const { createTauriQuery } = vi.hoisted(() => ({
	createTauriQuery: vi.fn((_command: string, _config: unknown) => ({ isLoading: false }))
}));

vi.mock('$infrastructure/create-tauri-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$infrastructure/create-tauri-query')>();
	return { ...actual, createTauriQuery };
});

type Config = { input: unknown; enabled: () => boolean };

function lastConfig(): Config {
	return createTauriQuery.mock.calls.at(-1)?.[1] as unknown as Config;
}

beforeEach(() => {
	createTauriQuery.mockClear();
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

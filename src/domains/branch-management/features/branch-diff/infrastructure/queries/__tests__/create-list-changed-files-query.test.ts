import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createListChangedFilesQuery } from '../create-list-changed-files-query';

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

describe('createListChangedFilesQuery', () => {
	it('wraps the listChangedFiles command with the given input', () => {
		const input = { path: '/repo', branchName: 'feature/x', commitSha: null };
		createListChangedFilesQuery(input);

		expect(createTauriQuery).toHaveBeenCalledWith(
			'listChangedFiles',
			expect.objectContaining({ input })
		);
	});

	it('is enabled for a branch target and for a commit target', () => {
		createListChangedFilesQuery({ path: '/repo', branchName: 'feature/x', commitSha: null });
		expect(lastConfig().enabled()).toBe(true);

		createListChangedFilesQuery({ path: '/repo', branchName: null, commitSha: 'abc1234' });
		expect(lastConfig().enabled()).toBe(true);
	});

	it('stays disabled while the path or target is missing', () => {
		createListChangedFilesQuery({ path: '', branchName: 'feature/x', commitSha: null });
		expect(lastConfig().enabled()).toBe(false);

		createListChangedFilesQuery({ path: '/repo', branchName: null, commitSha: null });
		expect(lastConfig().enabled()).toBe(false);
	});

	it('resolves function inputs when computing enabled', () => {
		createListChangedFilesQuery(() => ({ path: '/repo', branchName: 'b', commitSha: null }));
		expect(lastConfig().enabled()).toBe(true);
	});

	it('forwards extra query options', () => {
		createListChangedFilesQuery(
			{ path: '/repo', branchName: 'b', commitSha: null },
			{ staleTime: 5000 }
		);
		expect(createTauriQuery).toHaveBeenCalledWith(
			'listChangedFiles',
			expect.objectContaining({ staleTime: 5000 })
		);
	});
});

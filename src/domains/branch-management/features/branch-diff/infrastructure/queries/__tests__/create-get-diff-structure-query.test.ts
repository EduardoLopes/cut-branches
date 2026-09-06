import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createGetDiffStructureQuery } from '../create-get-diff-structure-query';

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

describe('createGetDiffStructureQuery', () => {
	it('wraps the getDiffStructure command with the given input', () => {
		const input = { path: '/repo', branchName: 'feature/x', commitSha: null };
		createGetDiffStructureQuery(input);

		expect(createTauriQuery).toHaveBeenCalledWith(
			'getDiffStructure',
			expect.objectContaining({ input })
		);
	});

	it('is enabled for a branch target and for a commit target', () => {
		createGetDiffStructureQuery({ path: '/repo', branchName: 'feature/x', commitSha: null });
		expect(lastConfig().enabled()).toBe(true);

		createGetDiffStructureQuery({ path: '/repo', branchName: null, commitSha: 'abc1234' });
		expect(lastConfig().enabled()).toBe(true);
	});

	it('stays disabled while the path or target is missing', () => {
		createGetDiffStructureQuery({ path: '', branchName: 'feature/x', commitSha: null });
		expect(lastConfig().enabled()).toBe(false);

		createGetDiffStructureQuery({ path: '/repo', branchName: null, commitSha: null });
		expect(lastConfig().enabled()).toBe(false);
	});

	it('resolves function inputs when computing enabled', () => {
		createGetDiffStructureQuery(() => ({ path: '/repo', branchName: 'b', commitSha: null }));
		expect(lastConfig().enabled()).toBe(true);
	});

	it('forwards extra query options', () => {
		createGetDiffStructureQuery(
			{ path: '/repo', branchName: 'b', commitSha: null },
			{ staleTime: 5000 }
		);
		expect(createTauriQuery).toHaveBeenCalledWith(
			'getDiffStructure',
			expect.objectContaining({ staleTime: 5000 })
		);
	});
});

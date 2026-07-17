import { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchBranchComparisonBatch } from '../create-list-branch-comparison-query';

const { executeCommand } = vi.hoisted(() => ({
	executeCommand: vi.fn(async (_command: string, input: { branchNames: string[] }) => ({
		baseName: 'main',
		baseSha: 'base-sha',
		branches: input.branchNames.map((name) => ({ name, sha: 's', ahead: 1, behind: 2 }))
	}))
}));

vi.mock('$infrastructure/tauri-commands', () => ({ executeCommand }));

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	executeCommand.mockClear();
});

describe('fetchBranchComparisonBatch', () => {
	it('sends the wire input with sorted branch names and no repoId', async () => {
		const result = await fetchBranchComparisonBatch(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['zeta', 'alpha']
		});

		expect(executeCommand).toHaveBeenCalledWith('listBranchComparison', {
			path: '/repo',
			base: null,
			branchNames: ['alpha', 'zeta']
		});
		expect(result.baseName).toBe('main');
		expect(result.branches.map((b) => b.name)).toEqual(['alpha', 'zeta']);
	});

	it('passes an explicit base through', async () => {
		await fetchBranchComparisonBatch(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			base: 'develop',
			branchNames: ['a']
		});

		expect(executeCommand).toHaveBeenCalledWith('listBranchComparison', {
			path: '/repo',
			base: 'develop',
			branchNames: ['a']
		});
	});

	it('dedupes identical batches regardless of name order via the cache', async () => {
		await fetchBranchComparisonBatch(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['b', 'a']
		});
		await fetchBranchComparisonBatch(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['a', 'b']
		});

		expect(executeCommand).toHaveBeenCalledTimes(1);
	});

	it('keys the cache with the owning repoId for invalidation', async () => {
		await fetchBranchComparisonBatch(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['a']
		});

		const key = [
			'branch-comparison',
			'listBranchComparison',
			{ repoId: 'repo-1', path: '/repo', base: null, branchNames: ['a'] }
		];
		expect(queryClient.getQueryData(key)).toBeDefined();
	});
});

import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBranchComparisons } from '../use-branch-comparisons.svelte';
import { reactiveHolder } from './reactive-holder.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { fetchBranchComparisonBatch } = vi.hoisted(() => ({
	fetchBranchComparisonBatch: vi.fn(async (_client: unknown, input: { branchNames: string[] }) => ({
		baseName: 'main',
		baseSha: 'base',
		branches: input.branchNames.map((name) => ({ name, sha: `${name}-sha`, ahead: 1, behind: 2 }))
	}))
}));

vi.mock('@tanstack/svelte-query', () => ({ useQueryClient: () => ({}) }));
vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-list-branch-comparison-query',
	() => ({ fetchBranchComparisonBatch })
);

const waitForBatch = () => vi.waitFor(() => expect(fetchBranchComparisonBatch).toHaveBeenCalled());

beforeEach(() => {
	fetchBranchComparisonBatch.mockClear();
});

describe('useBranchComparisons', () => {
	const setup = (path?: string) => {
		const pathHolder = reactiveHolder<string | undefined>(path);
		const visible = reactiveHolder<string[]>([]);
		const root = withEffectRoot(() =>
			useBranchComparisons({
				getRepoId: () => 'repo-1',
				getPath: () => pathHolder.value,
				getVisibleBranchNames: () => visible.value,
				debounceMs: 5
			})
		);
		flushSync();
		return { pathHolder, visible, root };
	};

	it('fetches signals for newly visible branches after the debounce', async () => {
		const { visible, root } = setup('/repo');
		visible.value = ['feature/a', 'feature/b'];
		flushSync();

		await waitForBatch();
		expect(fetchBranchComparisonBatch).toHaveBeenCalledWith(expect.anything(), {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['feature/a', 'feature/b']
		});

		await vi.waitFor(() => {
			expect(root.value.get('feature/a')).toEqual({ sha: 'feature/a-sha', ahead: 1, behind: 2 });
			expect(root.value.baseName).toBe('main');
		});
		root.cleanup();
	});

	it('only requests names not already fetched or inflight', async () => {
		const { visible, root } = setup('/repo');
		visible.value = ['feature/a'];
		flushSync();
		await waitForBatch();
		await vi.waitFor(() => expect(root.value.get('feature/a')).toBeDefined());

		visible.value = ['feature/a', 'feature/b'];
		flushSync();
		await vi.waitFor(() => expect(fetchBranchComparisonBatch).toHaveBeenCalledTimes(2));
		expect(fetchBranchComparisonBatch).toHaveBeenLastCalledWith(expect.anything(), {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['feature/b']
		});
		root.cleanup();
	});

	it('does nothing while the path is unknown', async () => {
		const { visible, root } = setup();
		visible.value = ['feature/a'];
		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(fetchBranchComparisonBatch).not.toHaveBeenCalled();
		expect(root.value.get('feature/a')).toBeUndefined();
		root.cleanup();
	});

	it('rolls back failed names so they can be retried', async () => {
		fetchBranchComparisonBatch.mockRejectedValueOnce({ kind: 'branch_comparison_failed' });
		const { visible, root } = setup('/repo');
		visible.value = ['feature/a'];
		flushSync();
		await waitForBatch();

		// A later visibility change retries the rolled-back name.
		visible.value = ['feature/a', 'feature/x'];
		flushSync();
		await vi.waitFor(() => expect(fetchBranchComparisonBatch).toHaveBeenCalledTimes(2));
		expect(fetchBranchComparisonBatch).toHaveBeenLastCalledWith(expect.anything(), {
			repoId: 'repo-1',
			path: '/repo',
			branchNames: ['feature/a', 'feature/x']
		});
		root.cleanup();
	});

	it('clears everything when the repository path changes', async () => {
		const { pathHolder, visible, root } = setup('/repo');
		visible.value = ['feature/a'];
		flushSync();
		await waitForBatch();
		await vi.waitFor(() => expect(root.value.get('feature/a')).toBeDefined());

		pathHolder.value = '/other-repo';
		flushSync();
		expect(root.value.get('feature/a')).toBeUndefined();
		expect(root.value.baseName).toBeNull();

		// The same names refetch against the new repo.
		await vi.waitFor(() =>
			expect(fetchBranchComparisonBatch).toHaveBeenLastCalledWith(expect.anything(), {
				repoId: 'repo-1',
				path: '/other-repo',
				branchNames: ['feature/a']
			})
		);
		root.cleanup();
	});

	it('reset() forgets fetched signals and refetches the visible names', async () => {
		const { visible, root } = setup('/repo');
		visible.value = ['feature/a'];
		flushSync();
		await waitForBatch();
		await vi.waitFor(() => expect(root.value.get('feature/a')).toBeDefined());

		root.value.reset();
		expect(root.value.get('feature/a')).toBeUndefined();
		await vi.waitFor(() => expect(fetchBranchComparisonBatch).toHaveBeenCalledTimes(2));
		root.cleanup();
	});
});

import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { type GetBranchListOutput } from '$infrastructure/bindings';
import { prefetchTauriQuery } from '$infrastructure/create-tauri-query';
import { bulkBranchMetricsQueryOptions } from '$infrastructure/queries/create-bulk-branch-metrics-query';
import { getBucketBranchNames } from '$utils/branch-metrics-buckets';

/** Long enough that skimming the list costs nothing, short enough that a
 *  deliberate hover has warmed the cache before the click lands. */
const HOVER_DEBOUNCE_MS = 200;

/** Prefetched entries stay usable for this long before a real observer would
 *  refetch them — the whole point is that arriving on the page is a cache hit. */
const PREFETCH_STALE_TIME = 5 * 60 * 1000;

/**
 * Warms every query `/repos/[id]` mounts on arrival.
 *
 * The filters and inputs here must match the page's queries *exactly*: the
 * query key embeds the input, so a missing `includeCurrent` (or a bucket size
 * that has drifted from the branch list's) produces a *different* key and the
 * prefetch warms a cache entry the page never reads — the repository still
 * opens on a cold fetch.
 */
async function prefetchRepository(queryClient: QueryClient, repoId: string, repoPath?: string) {
	// Matches `useActiveBranchesView`/`BranchList`.
	const branchListInput = {
		repoId,
		filters: { deletionStatus: 'active' as const, includeCurrent: true }
	};

	const warmed = Promise.all([
		prefetchTauriQuery(queryClient, 'getBranchList', {
			input: branchListInput,
			staleTime: PREFETCH_STALE_TIME
		}),
		// Observed by the repo layout, the context tabs, the footer and the view.
		prefetchTauriQuery(queryClient, 'getRepository', {
			input: { id: repoId },
			staleTime: PREFETCH_STALE_TIME
		}),
		// Every branch card mounts a lock toggle against this one key.
		prefetchTauriQuery(queryClient, 'listLockedBranches', {
			input: { repoId },
			staleTime: PREFETCH_STALE_TIME
		}),
		// The Worktrees tab's count badge renders immediately, alongside the
		// branch list — it is part of the first paint, not of that tab's page.
		// The path comes from `getRepositoryList`, which the sidebar already has,
		// so this doesn't have to wait on `getRepository`.
		repoPath
			? prefetchTauriQuery(queryClient, 'listWorktrees', {
					input: { path: repoPath },
					staleTime: PREFETCH_STALE_TIME
				})
			: undefined
	]);

	await warmed;

	// The per-card merge-status and diff-stat badges. Their bucket key is keyed
	// by branch *names*, so this can only be built once the branch list has
	// landed — hence the chained second wave rather than a parallel one.
	if (!repoPath) return;
	const branchList = queryClient.getQueryData<GetBranchListOutput>([
		'branch',
		'getBranchList',
		branchListInput
	]);
	if (!branchList) return;

	// Bucket 0 as the branch list will compute it: current branch hoisted to the
	// top, otherwise source order, no search filter (a repository opens with an
	// empty search). A stale search term makes this a miss, not a bug — the
	// bucket the list actually asks for is then simply still cold.
	const names = branchList.branches
		.toSorted((a, b) => Number(b.current) - Number(a.current))
		.map((branch) => branch.name);
	const firstBucket = getBucketBranchNames(names, 0);
	if (firstBucket.length === 0) return;

	await queryClient.prefetchQuery(
		bulkBranchMetricsQueryOptions({ path: repoPath, branchNames: firstBucket })
	);
}

/**
 * Creates a prefetch function for everything the repository page renders on
 * arrival.
 *
 * Lives in `$lib` (§2, globally-shared stateful framework-dependent logic)
 * rather than in a domain: the sidebar (repository-navigation) warms a
 * repository on hover, and the startup redirect (onboarding) warms the
 * remembered one — two domains, so neither may own it.
 *
 * Prefetches the branches, the repository details, the locked branches, the
 * worktrees, and the first bucket of branch metrics.
 *
 * Two entry points, because they answer different signals:
 * - `prefetch(...)` is debounced — for `mouseenter`/`focus`, where the user is
 *   only *maybe* going here and a skim shouldn't fire a request per row.
 * - `prefetch.now(...)` skips the debounce — for `pointerdown`, where the
 *   intent is settled and the ~100ms before `click` is free lead time.
 *
 * @example
 * const prefetchRepositoryData = createPrefetchRepositoryData();
 *
 * onmouseenter: () => prefetchRepositoryData(repo.id, repo.path),
 * onpointerdown: () => prefetchRepositoryData.now(repo.id, repo.path),
 */
export function createPrefetchRepositoryData() {
	const queryClient = useQueryClient();

	const run = (repoId: string, repoPath?: string) => {
		prefetchRepository(queryClient, repoId, repoPath).catch(() => {
			// Prefetch only; the page's own observers surface real errors.
		});
	};

	const debouncedPrefetch = debounce(run, HOVER_DEBOUNCE_MS);

	const prefetch = (repoId: string, repoPath?: string) => {
		debouncedPrefetch(repoId, repoPath);
	};

	/** Fires immediately, cancelling any pending hover prefetch for the same
	 *  (or another) repository — the committed navigation wins the queue. */
	prefetch.now = (repoId: string, repoPath?: string) => {
		debouncedPrefetch.cancel();
		run(repoId, repoPath);
	};

	/** Drops a pending hover prefetch, e.g. when the list unmounts. */
	prefetch.cancel = () => debouncedPrefetch.cancel();

	return prefetch;
}

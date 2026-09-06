import type { QueryClient } from '@tanstack/svelte-query';
import type { ListBranchComparisonOutput } from '$infrastructure/bindings';
import { executeCommand } from '$infrastructure/tauri-commands';

export interface BranchComparisonBatchInput {
	/** Owning repository id — only used in the query key (for watcher and
	 *  mutation invalidation); the wire input carries the path. */
	repoId: string;
	path: string;
	/** Optional explicit base; the backend defaults to main → master → HEAD. */
	base?: string;
	/** Local branch names to compare. Names deleted meanwhile are silently
	 *  absent from the result — absence is NOT `ahead === 0`. */
	branchNames: string[];
}

/** Comparisons stay valid until refs move; the watcher/mutation invalidation
 *  clears them, so within a session they can stay fresh for a while. */
const COMPARISON_STALE_TIME = 1000 * 60;

/**
 * Fetches ahead/behind signals for a batch of branches through the query
 * cache. Branch names are sorted into a canonical key so identical batches
 * (regardless of gutter order) dedupe into one request.
 */
export function fetchBranchComparisonBatch(
	queryClient: QueryClient,
	input: BranchComparisonBatchInput
): Promise<ListBranchComparisonOutput> {
	const branchNames = [...input.branchNames].sort();
	const wireInput = {
		path: input.path,
		base: input.base ?? null,
		branchNames
	};

	return queryClient.fetchQuery({
		queryKey: ['branch-comparison', 'listBranchComparison', { repoId: input.repoId, ...wireInput }],
		queryFn: () => executeCommand('listBranchComparison', wireInput),
		staleTime: COMPARISON_STALE_TIME
	});
}

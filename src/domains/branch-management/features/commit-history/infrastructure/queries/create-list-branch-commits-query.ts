import { type QueryClient } from '@tanstack/svelte-query';
import type { HistoryCommit } from '../../models/commit-graph';
import type { HistoryCommit as HistoryCommitData } from '$infrastructure/bindings';
import {
	createTauriQuery,
	prefetchTauriQuery,
	type TauriQueryOptions
} from '$infrastructure/create-tauri-query';

// ACL check: the wire commit must satisfy the domain model. If the backend
// shape drifts, this line fails to compile instead of breaking at runtime.
const _assertWireMatchesDomain = (data: HistoryCommitData): HistoryCommit => data;
void _assertWireMatchesDomain;

export interface ListBranchCommitsQueryInput {
	/** Owning repository id — only used in the query key (for watcher and
	 *  mutation invalidation); the wire input carries the path. */
	repoId: string;
	path: string;
	/** Local branch whose ancestry to walk. */
	branch: string;
	limit?: number;
}

/** How many commits the branch-card disclosure asks for. Deliberately small:
 *  it is a peek at recent work, not a history browser — the full view is one
 *  click away. */
export const BRANCH_COMMITS_PAGE_SIZE = 10;

/** Recent commits stay valid until refs move (watcher/mutations invalidate). */
const BRANCH_COMMITS_STALE_TIME = 1000 * 60;

/**
 * The newest commits on a single branch, newest first. Unlike
 * `createListCommitHistoryInfiniteQuery` — which walks every local branch at
 * once for the graph view — this is scoped to one branch's ancestry, so it
 * answers "what happened on this branch recently".
 */
/** Wire input + the key it lives under. Shared by the query and the prefetch
 *  below so the disclosure and its warm-up can never key differently. */
function branchCommitsQueryConfig(input: ListBranchCommitsQueryInput) {
	const wireInput = {
		path: input.path,
		branch: input.branch,
		limit: input.limit ?? BRANCH_COMMITS_PAGE_SIZE
	};
	return {
		wireInput,
		queryKey: ['branch-commits', 'listBranchCommits', { repoId: input.repoId, ...wireInput }]
	};
}

export function createListBranchCommitsQuery(
	input: () => ListBranchCommitsQueryInput,
	options?: Partial<TauriQueryOptions<'listBranchCommits'>>
) {
	return createTauriQuery('listBranchCommits', {
		queryKey: () => branchCommitsQueryConfig(input()).queryKey,
		input: () => branchCommitsQueryConfig(input()).wireInput,
		staleTime: BRANCH_COMMITS_STALE_TIME,
		enabled: () => !!input().path && !!input().branch,
		...options
	});
}

/**
 * Warms one branch's disclosure panel. The panel's component is mounted only
 * while the disclosure is open, so without this its query starts on the click
 * and the panel always opens on "Loading commits…".
 */
export function prefetchBranchCommits(
	queryClient: QueryClient,
	input: ListBranchCommitsQueryInput
) {
	if (!input.path || !input.branch) return;
	const { wireInput, queryKey } = branchCommitsQueryConfig(input);
	return prefetchTauriQuery(queryClient, 'listBranchCommits', {
		queryKey,
		input: wireInput,
		staleTime: BRANCH_COMMITS_STALE_TIME
	});
}

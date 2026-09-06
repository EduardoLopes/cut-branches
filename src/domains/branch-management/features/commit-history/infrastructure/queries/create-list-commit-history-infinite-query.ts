import type { HistoryCommit } from '../../models/commit-graph';
import type {
	HistoryCommit as HistoryCommitData,
	ListCommitHistoryOutput
} from '$infrastructure/bindings';
import {
	createTauriInfiniteQuery,
	type TauriInfiniteQueryOptions
} from '$infrastructure/create-tauri-infinite-query';

// ACL check: the wire commit must satisfy the domain model. If the backend
// shape drifts, this line fails to compile instead of breaking at runtime.
const _assertWireMatchesDomain = (data: HistoryCommitData): HistoryCommit => data;
void _assertWireMatchesDomain;

export interface ListCommitHistoryQueryInput {
	/** Owning repository id — only used in the query key (for watcher and
	 *  mutation invalidation); the wire input carries the path. */
	repoId: string;
	path: string;
	limit?: number;
}

export const COMMIT_HISTORY_PAGE_SIZE = 200;

/**
 * Cursor-paged commit history for a repository. Pages accumulate via
 * TanStack's infinite query; `nextCursor: null` marks the last page. A
 * `history_cursor_stale` error on a later page means refs changed mid-scroll
 * — reset the query and restart from the first page.
 */
export function createListCommitHistoryInfiniteQuery(
	input: () => ListCommitHistoryQueryInput,
	options?: Partial<TauriInfiniteQueryOptions<'listCommitHistory', string | null>>
) {
	const wireInput = () => ({
		path: input().path,
		limit: input().limit ?? COMMIT_HISTORY_PAGE_SIZE
	});

	return createTauriInfiniteQuery('listCommitHistory', {
		queryKey: () => [
			'commit-history',
			'listCommitHistory',
			{ repoId: input().repoId, ...wireInput() }
		],
		input: wireInput,
		withPageParam: (base, cursor) => (cursor === null ? base : { ...base, cursor }),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage: ListCommitHistoryOutput) => lastPage.nextCursor ?? undefined,
		enabled: () => !!input().path,
		...options
	});
}

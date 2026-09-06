import type { QueryClient } from '@tanstack/svelte-query';
import type { GetCommitHistoryWindowOutput } from '$infrastructure/bindings';
import { executeCommand } from '$infrastructure/tauri-commands';

export interface CommitHistoryWindowInput {
	/** Owning repository id — only used in the query key (for watcher and
	 *  mutation invalidation); the wire input carries the path. */
	repoId: string;
	path: string;
	/** Full or short SHA of the commit to locate. */
	targetSha: string;
	/** Commits of context to include before (newer than) the target. */
	contextBefore?: number;
	limit?: number;
}

/** Windows stay valid until refs move (watcher/mutations invalidate them). */
const WINDOW_STALE_TIME = 1000 * 60;

/** Window shape used by the hover graph preview — shared between the preview
 *  component and hover prefetching so both hit the same cache entry. */
export const PREVIEW_WINDOW = { contextBefore: 6, limit: 15 } as const;

/**
 * Fetches a history window centred on a commit through the query cache —
 * used by the hover graph preview and (with a minimal window) by
 * `fetchCommitLocation`. Rejects with kind `commit_not_found` for a sha
 * that isn't in the repository.
 */
export function fetchCommitHistoryWindow(
	queryClient: QueryClient,
	input: CommitHistoryWindowInput
): Promise<GetCommitHistoryWindowOutput> {
	const wireInput = {
		path: input.path,
		targetSha: input.targetSha,
		contextBefore: input.contextBefore ?? 0,
		limit: input.limit ?? 1
	};

	return queryClient.fetchQuery({
		queryKey: [
			'commit-history-window',
			'getCommitHistoryWindow',
			{ repoId: input.repoId, ...wireInput }
		],
		queryFn: () => executeCommand('getCommitHistoryWindow', wireInput),
		staleTime: WINDOW_STALE_TIME
	});
}

export interface CommitLocation {
	/** Absolute index of the commit in the full history walk. */
	targetIndex: number;
	totalCount: number;
}

/**
 * Locates a commit's absolute index in the history walk (deep-linking).
 * A cheap call: the backend answers from its cached ordering.
 */
export async function fetchCommitLocation(
	queryClient: QueryClient,
	input: Omit<CommitHistoryWindowInput, 'contextBefore' | 'limit'>
): Promise<CommitLocation> {
	const window = await fetchCommitHistoryWindow(queryClient, {
		...input,
		contextBefore: 0,
		limit: 1
	});
	return { targetIndex: window.targetIndex, totalCount: window.totalCount };
}

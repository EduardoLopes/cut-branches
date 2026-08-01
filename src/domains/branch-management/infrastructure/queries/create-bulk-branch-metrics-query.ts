import {
	type AppError,
	type BulkGetBranchMetricsInput,
	type BulkGetBranchMetricsOutput
} from '$infrastructure/bindings';
import { createQueryKey } from '$infrastructure/create-tauri-query';
import { executeCommand } from '$infrastructure/tauri-commands';

/** Branch metrics only move when refs move, and every ref-changing mutation
 *  (and the filesystem watcher's `repository-changed` event) invalidates this
 *  key family explicitly — so the entries can stay fresh far longer than the
 *  60s global default without going stale in practice. */
export const BULK_BRANCH_METRICS_STALE_TIME = 5 * 60 * 1000;
export const BULK_BRANCH_METRICS_GC_TIME = 10 * 60 * 1000;

/**
 * Query options for one bucket of branch metrics (merge status + diff stats
 * for a batch of branches, resolved by a single repo open on the Rust side).
 *
 * Shaped as a plain options object (not a `createQuery` wrapper) so callers
 * can feed a dynamic set of buckets to `createQueries`.
 */
export function bulkBranchMetricsQueryOptions(input: BulkGetBranchMetricsInput) {
	return {
		queryKey: createQueryKey('bulkGetBranchMetrics', input),
		queryFn: (): Promise<BulkGetBranchMetricsOutput> =>
			executeCommand('bulkGetBranchMetrics', input),
		enabled: !!input.path && input.branchNames.length > 0,
		staleTime: BULK_BRANCH_METRICS_STALE_TIME,
		gcTime: BULK_BRANCH_METRICS_GC_TIME
	} as const;
}

export type { BulkGetBranchMetricsOutput, AppError };

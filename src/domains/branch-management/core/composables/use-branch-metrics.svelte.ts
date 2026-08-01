/**
 * Branch Metrics Composable
 *
 * Feeds the branch list's per-card merge-status and diff-stat badges from the
 * bulk `bulkGetBranchMetrics` command instead of two Tauri commands per row:
 * the currently visible index range is mapped to position-aligned buckets
 * (see branch-metrics-buckets.ts), one query runs per touched bucket, and
 * rows read their numbers out of a derived name → metrics map.
 *
 * The range is debounced so a fast flick doesn't fire a request per frame —
 * only where the viewport settles costs anything.
 */
import { createQueries } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { bulkBranchMetricsQueryOptions } from '../../infrastructure/queries/create-bulk-branch-metrics-query';
import { getBucketBranchNames, getBucketIndicesForRange } from '../../utils/branch-metrics-buckets';

export interface BranchMetricsEntry {
	isMerged: boolean;
	linesAdded: number;
	linesRemoved: number;
}

export interface VisibleRange {
	startIndex: number;
	endIndex: number;
}

/** How long the viewport has to settle before buckets are (re)computed. */
const RANGE_DEBOUNCE_MS = 150;

export interface UseBranchMetricsConfig {
	/** Repository working-directory path; metrics are disabled without one. */
	path: () => string | undefined;
	/** Ordered branch names the list renders — bucket slices index into this. */
	branchNames: () => readonly string[];
	/** Inclusive index range the viewport currently covers, or null before
	 *  the virtualizer has measured. */
	visibleRange: () => VisibleRange | null;
	/** Master switch (e.g. off for the deleted-branches view, where refs are
	 *  gone and neither merge status nor diff stats can resolve). */
	enabled?: () => boolean;
}

export function useBranchMetrics(config: UseBranchMetricsConfig) {
	// Debounced snapshot of the visible bucket indices. Plain $state written
	// from a debounced callback: the effect below tracks the live range, but
	// queries only re-key when the debounce fires.
	let settledBuckets = $state<number[]>([]);

	const applyRange = debounce((buckets: number[]) => {
		// Cheap identity check keeps query re-evaluation off no-op settles.
		if (
			buckets.length === settledBuckets.length &&
			buckets.every((b, i) => b === settledBuckets[i])
		) {
			return;
		}
		settledBuckets = buckets;
	}, RANGE_DEBOUNCE_MS);

	$effect(() => {
		if (!(config.enabled?.() ?? true) || !config.path()) {
			applyRange.cancel();
			settledBuckets = [];
			return;
		}
		const range = config.visibleRange();
		if (!range) return;
		applyRange(getBucketIndicesForRange(range.startIndex, range.endIndex));
		// Teardown also runs on unmount, so a pending debounce never fires
		// against a torn-down query scope. (Between runs it just restarts the
		// timer, which is the debounce semantics anyway.)
		return () => applyRange.cancel();
	});

	const queries = createQueries(() => ({
		queries: settledBuckets
			.map((bucket) => ({
				bucket,
				names: getBucketBranchNames(config.branchNames(), bucket)
			}))
			.filter(({ names }) => names.length > 0)
			.map(({ names }) =>
				bulkBranchMetricsQueryOptions({
					path: config.path() ?? '',
					branchNames: names
				})
			)
	}));

	const metricsByName = $derived.by(() => {
		// Built fresh inside the derivation and never mutated afterwards — the
		// reactivity comes from the derivation re-running, not from the Map.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string, BranchMetricsEntry>();
		for (const query of queries) {
			for (const metric of query.data?.metrics ?? []) {
				map.set(metric.name, {
					isMerged: metric.isMerged,
					linesAdded: metric.linesAdded,
					linesRemoved: metric.linesRemoved
				});
			}
		}
		return map;
	});

	const anyLoading = $derived(queries.some((query) => query.isLoading));

	return {
		/** Metrics for a branch, or undefined while its bucket is pending (or
		 *  when the branch no longer resolves on the Rust side). */
		getMetrics(name: string): BranchMetricsEntry | undefined {
			return metricsByName.get(name);
		},
		/** True while any touched bucket is still fetching — drives the cards'
		 *  placeholder badges. */
		get isLoading() {
			return anyLoading;
		}
	};
}

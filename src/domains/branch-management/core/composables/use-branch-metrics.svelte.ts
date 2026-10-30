/**
 * Branch Metrics Composable
 *
 * Feeds the branch list's per-card merge-status and diff-stat badges from the
 * bulk `bulkGetBranchMetrics` command instead of two Tauri commands per row:
 * the currently visible index range is mapped to position-aligned buckets
 * (see branch-metrics-buckets.ts), one query runs per touched bucket, and
 * rows read their numbers out of a name → metrics map.
 *
 * The range is debounced so a fast flick doesn't fire a request per frame —
 * only where the viewport settles costs anything. The map outlives the
 * buckets that filled it: a row scrolling back into view (or a search
 * reshuffling the buckets) shows its numbers at once instead of blanking
 * until its bucket is subscribed again.
 *
 * Given a query client, the rest of the list fills in behind the viewport:
 * once the list has settled, every bucket is fetched one at a time, nearest
 * first. A fast scroll then lands on rows whose numbers are already there,
 * instead of waiting for the scroll to stop and its buckets to be asked for.
 */
import { createQueries, type QueryClient } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { untrack } from 'svelte';
import {
	bulkBranchMetricsQueryOptions,
	type BulkGetBranchMetricsOutput
} from '$infrastructure/queries/create-bulk-branch-metrics-query';
import {
	getBucketBranchNames,
	getBucketIndicesForRange,
	getBucketIndicesOutward
} from '$utils/branch-metrics-buckets';

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

/** How long the list has to settle (arrival, a new search) before the rest of
 *  the buckets start filling in, so the fill never competes with the
 *  viewport's own first requests. */
export const BACKGROUND_FILL_DELAY_MS = 800;

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
	/** Fills in every bucket in the background once the list settles (see the
	 *  file comment). Without it, only the buckets on screen are fetched. */
	queryClient?: QueryClient;
}

/** A snapshot of metrics: replaced wholesale, never mutated, so a plain Map. */
function snapshot(
	entries: Iterable<[string, BranchMetricsEntry]> = []
): ReadonlyMap<string, BranchMetricsEntry> {
	return new Map(entries);
}

function toEntries(output: BulkGetBranchMetricsOutput): [string, BranchMetricsEntry][] {
	return output.metrics.map((metric) => [
		metric.name,
		{
			isMerged: metric.isMerged,
			linesAdded: metric.linesAdded,
			linesRemoved: metric.linesRemoved
		}
	]);
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
		const buckets = getBucketIndicesForRange(range.startIndex, range.endIndex);
		// First range after mount (or re-enable): fire immediately. The debounce
		// exists to absorb scrolling, but on arrival there is nothing to absorb —
		// waiting just adds RANGE_DEBOUNCE_MS on top of the fetch the viewport is
		// already showing placeholders for.
		if (settledBuckets.length === 0 && buckets.length > 0) {
			settledBuckets = buckets;
			return;
		}
		applyRange(buckets);
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

	// The background fill. Restarts when the repository or the list's names
	// change (a search reshuffles the buckets); buckets still fresh in the
	// cache resolve without a request, so a restart only fetches what's new.
	// It starts from the viewport, read once: scrolling doesn't restart it.
	let filled = $state(snapshot());
	let filledPath: string | undefined;
	const namesKey = $derived(config.branchNames().join('\n'));

	$effect(() => {
		const client = config.queryClient;
		const path = (config.enabled?.() ?? true) ? config.path() : undefined;
		void namesKey;
		const names = untrack(() => config.branchNames());
		if (path !== filledPath) {
			filled = snapshot();
			filledPath = path;
		}
		if (!client || !path || names.length === 0) return;

		const order = getBucketIndicesOutward(
			names.length,
			untrack(() => settledBuckets[0] ?? 0)
		);
		let cancelled = false;
		const timer = setTimeout(async () => {
			for (const bucket of order) {
				if (cancelled) return;
				try {
					const output = await client.fetchQuery(
						bulkBranchMetricsQueryOptions({
							path,
							branchNames: getBucketBranchNames(names, bucket)
						})
					);
					if (cancelled) return;
					filled = snapshot([...filled, ...toEntries(output)]);
				} catch {
					// The buckets on screen surface their own errors; the fill
					// just moves on to the next one.
				}
			}
		}, BACKGROUND_FILL_DELAY_MS);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	// Every metric a bucket has resolved, for this path. Not reactive itself:
	// the derivation below refills it from whichever buckets are subscribed
	// and re-runs when their data changes, so a refetch overwrites in place
	// and an unsubscribed bucket's numbers stay readable.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const known = new Map<string, BranchMetricsEntry>();
	let knownPath: string | undefined;

	const metricsByName = $derived.by(() => {
		const path = (config.enabled?.() ?? true) ? config.path() : undefined;
		if (path !== knownPath) {
			known.clear();
			knownPath = path;
		}
		// Just cleared: nothing to read without a repository.
		if (!path) return known;
		for (const query of queries) {
			if (query.data) for (const [name, entry] of toEntries(query.data)) known.set(name, entry);
		}
		// A fresh copy, so the derivation's value changes when the data does.
		// The subscribed buckets win: they refetch when the cache is
		// invalidated, the fill's numbers don't.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		return new Map([...filled, ...known]);
	});

	return {
		/** Metrics for a branch, or undefined until its bucket first resolves
		 *  (or when the branch no longer resolves on the Rust side). */
		getMetrics(name: string): BranchMetricsEntry | undefined {
			return metricsByName.get(name);
		}
	};
}

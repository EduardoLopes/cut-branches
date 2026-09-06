import { flushSync } from 'svelte';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBranchMetrics, type VisibleRange } from '../use-branch-metrics.svelte';
import type { BulkGetBranchMetricsOutput } from '$infrastructure/bindings';

// Capture the queries accessor handed to createQueries and drive its results
// from a controllable holder — no QueryClient needed.
type QueryOptionsShape = {
	queryKey: unknown[];
	enabled: boolean;
};
type QueryResultShape = {
	data?: BulkGetBranchMetricsOutput;
	isLoading: boolean;
};

let queriesAccessor: (() => { queries: QueryOptionsShape[] }) | undefined;
let queryResults: QueryResultShape[] = [];

vi.mock('@tanstack/svelte-query', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/svelte-query')>()),
	createQueries: (accessor: () => { queries: QueryOptionsShape[] }) => {
		queriesAccessor = accessor;
		return {
			// The composable iterates the result like an array.
			[Symbol.iterator]() {
				return queryResults[Symbol.iterator]();
			},
			some: (fn: (q: QueryResultShape) => boolean) => queryResults.some(fn),
			get length() {
				return queryResults.length;
			}
		};
	}
}));

const RANGE_DEBOUNCE_MS = 150;

function metricsOutput(names: string[]): BulkGetBranchMetricsOutput {
	return {
		metrics: names.map((name) => ({
			name,
			isMerged: name.includes('merged'),
			linesAdded: 3,
			linesRemoved: 1
		}))
	};
}

describe('useBranchMetrics', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		queriesAccessor = undefined;
		queryResults = [];
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function setup(overrides?: {
		path?: () => string | undefined;
		enabled?: () => boolean;
		names?: () => readonly string[];
	}) {
		let range = $state<VisibleRange | null>(null);
		let metrics: ReturnType<typeof useBranchMetrics>;
		const cleanup = $effect.root(() => {
			metrics = useBranchMetrics({
				path: overrides?.path ?? (() => '/repo'),
				branchNames: overrides?.names ?? (() => ['merged-a', 'branch-b']),
				visibleRange: () => range,
				enabled: overrides?.enabled
			});
		});
		flushSync();
		return {
			get metrics() {
				return metrics;
			},
			setRange(next: VisibleRange | null) {
				range = next;
				flushSync();
			},
			cleanup
		};
	}

	function settle() {
		vi.advanceTimersByTime(RANGE_DEBOUNCE_MS);
		flushSync();
	}

	test('fires the first range immediately, then debounces later changes', () => {
		const names = Array.from({ length: 45 }, (_, i) => `branch-${i}`);
		const harness = setup({ names: () => names });
		expect(queriesAccessor!().queries).toEqual([]);

		// First range after mount: no debounce — the viewport is already
		// showing placeholder badges, so waiting only delays the fetch.
		harness.setRange({ startIndex: 0, endIndex: 5 });
		const queries = queriesAccessor!().queries;
		expect(queries).toHaveLength(1);
		expect(queries[0].enabled).toBe(true);

		// Subsequent range changes go through the debounce.
		harness.setRange({ startIndex: 21, endIndex: 25 });
		expect(queriesAccessor!().queries).toHaveLength(1);
		settle();
		expect(queriesAccessor!().queries).toHaveLength(1);
		expect(queriesAccessor!().queries[0].queryKey).not.toEqual(queries[0].queryKey);
		harness.cleanup();
	});

	test('exposes metrics by branch name once a bucket resolves', () => {
		const harness = setup();
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();

		queryResults = [{ data: metricsOutput(['merged-a', 'branch-b']), isLoading: false }];
		expect(harness.metrics.getMetrics('merged-a')).toEqual({
			isMerged: true,
			linesAdded: 3,
			linesRemoved: 1
		});
		expect(harness.metrics.getMetrics('branch-b')?.isMerged).toBe(false);
		expect(harness.metrics.getMetrics('missing')).toBeUndefined();
		expect(harness.metrics.isLoading).toBe(false);
		harness.cleanup();
	});

	test('reports loading while any bucket is fetching', () => {
		const harness = setup();
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();

		queryResults = [{ data: undefined, isLoading: true }];
		expect(harness.metrics.isLoading).toBe(true);
		expect(harness.metrics.getMetrics('merged-a')).toBeUndefined();
		harness.cleanup();
	});

	test('spans buckets when the visible range crosses a boundary', () => {
		const names = Array.from({ length: 45 }, (_, i) => `branch-${i}`);
		const harness = setup({ names: () => names });
		harness.setRange({ startIndex: 15, endIndex: 25 });
		settle();

		expect(queriesAccessor!().queries).toHaveLength(2);
		harness.cleanup();
	});

	test('a rapid range change after the first only settles once', () => {
		const names = Array.from({ length: 80 }, (_, i) => `branch-${i}`);
		const harness = setup({ names: () => names });
		// First range fires immediately (bucket 0).
		harness.setRange({ startIndex: 0, endIndex: 1 });
		expect(queriesAccessor!().queries).toHaveLength(1);

		// Two rapid changes: the first timer is superseded, so bucket 0 is
		// still the only settled bucket until the debounce elapses.
		harness.setRange({ startIndex: 21, endIndex: 24 });
		vi.advanceTimersByTime(RANGE_DEBOUNCE_MS / 2);
		harness.setRange({ startIndex: 41, endIndex: 44 });
		vi.advanceTimersByTime(RANGE_DEBOUNCE_MS / 2);
		flushSync();
		expect(queriesAccessor!().queries).toHaveLength(1);

		settle();
		expect(queriesAccessor!().queries).toHaveLength(1);
		expect(queriesAccessor!().queries[0].queryKey).toEqual(
			expect.arrayContaining([expect.anything()])
		);
		harness.cleanup();
	});

	test('clears buckets when disabled', () => {
		let enabled = $state(true);
		const harness = setup({ enabled: () => enabled });
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();
		expect(queriesAccessor!().queries).toHaveLength(1);

		enabled = false;
		flushSync();
		expect(queriesAccessor!().queries).toEqual([]);
		harness.cleanup();
	});

	test('requests nothing without a repository path', () => {
		const harness = setup({ path: () => undefined });
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();
		expect(queriesAccessor!().queries).toEqual([]);
		harness.cleanup();
	});

	test('skips empty bucket slices past the end of the list', () => {
		const harness = setup({ names: () => ['only-one'] });
		// Range far past the single-name list still yields no query for the
		// empty tail bucket.
		harness.setRange({ startIndex: 30, endIndex: 45 });
		settle();
		expect(queriesAccessor!().queries).toEqual([]);
		harness.cleanup();
	});
});

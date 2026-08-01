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

	test('requests no buckets until the range settles', () => {
		const harness = setup();
		expect(queriesAccessor!().queries).toEqual([]);

		harness.setRange({ startIndex: 0, endIndex: 5 });
		// Debounce pending — still nothing.
		expect(queriesAccessor!().queries).toEqual([]);

		settle();
		const queries = queriesAccessor!().queries;
		expect(queries).toHaveLength(1);
		expect(queries[0].enabled).toBe(true);
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

	test('a rapid range change only settles once', () => {
		const harness = setup();
		harness.setRange({ startIndex: 0, endIndex: 1 });
		vi.advanceTimersByTime(RANGE_DEBOUNCE_MS / 2);
		harness.setRange({ startIndex: 2, endIndex: 4 });
		vi.advanceTimersByTime(RANGE_DEBOUNCE_MS / 2);
		// First timer was superseded, so nothing has settled yet.
		flushSync();
		expect(queriesAccessor!().queries).toEqual([]);

		settle();
		expect(queriesAccessor!().queries).toHaveLength(1);
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

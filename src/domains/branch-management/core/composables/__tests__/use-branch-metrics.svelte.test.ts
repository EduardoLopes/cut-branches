import type { QueryClient } from '@tanstack/svelte-query';
import { flushSync } from 'svelte';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	BACKGROUND_FILL_DELAY_MS,
	useBranchMetrics,
	type VisibleRange
} from '../use-branch-metrics.svelte';
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
// State, like the real createQueries result: the composable's derivation
// re-runs when a test swaps it.
let queryResults = $state<QueryResultShape[]>([]);

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
		queryClient?: QueryClient;
	}) {
		let range = $state<VisibleRange | null>(null);
		let metrics: ReturnType<typeof useBranchMetrics>;
		const cleanup = $effect.root(() => {
			metrics = useBranchMetrics({
				path: overrides?.path ?? (() => '/repo'),
				branchNames: overrides?.names ?? (() => ['merged-a', 'branch-b']),
				visibleRange: () => range,
				enabled: overrides?.enabled,
				queryClient: overrides?.queryClient
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
		harness.cleanup();
	});

	test('has nothing for a branch while its bucket is fetching', () => {
		const harness = setup();
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();

		queryResults = [{ data: undefined, isLoading: true }];
		expect(harness.metrics.getMetrics('merged-a')).toBeUndefined();
		harness.cleanup();
	});

	test('keeps metrics after the viewport leaves their bucket', () => {
		const harness = setup();
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();
		queryResults = [{ data: metricsOutput(['merged-a', 'branch-b']), isLoading: false }];
		expect(harness.metrics.getMetrics('branch-b')?.linesAdded).toBe(3);

		// Scrolled elsewhere: the bucket's query is no longer subscribed.
		queryResults = [{ data: undefined, isLoading: true }];
		expect(harness.metrics.getMetrics('branch-b')?.linesAdded).toBe(3);

		// A refetch overwrites what was kept.
		queryResults = [
			{
				data: { metrics: [{ name: 'branch-b', isMerged: true, linesAdded: 9, linesRemoved: 0 }] },
				isLoading: false
			}
		];
		expect(harness.metrics.getMetrics('branch-b')).toEqual({
			isMerged: true,
			linesAdded: 9,
			linesRemoved: 0
		});
		harness.cleanup();
	});

	test('forgets kept metrics when the repository changes or metrics turn off', () => {
		let path = $state('/repo');
		let enabled = $state(true);
		const harness = setup({ path: () => path, enabled: () => enabled });
		harness.setRange({ startIndex: 0, endIndex: 1 });
		settle();
		queryResults = [{ data: metricsOutput(['merged-a']), isLoading: false }];
		expect(harness.metrics.getMetrics('merged-a')).toBeDefined();

		queryResults = [];
		path = '/other';
		flushSync();
		expect(harness.metrics.getMetrics('merged-a')).toBeUndefined();

		queryResults = [{ data: metricsOutput(['merged-a']), isLoading: false }];
		enabled = false;
		flushSync();
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

	describe('background fill', () => {
		/** A query client whose fetchQuery answers any bucket with its names. */
		function fakeClient(fail?: (names: string[]) => boolean) {
			const fetchQuery = vi.fn(async ({ queryKey }: { queryKey: unknown[] }) => {
				const input = queryKey.at(-1) as { branchNames: string[] };
				if (fail?.(input.branchNames)) throw new Error('boom');
				return metricsOutput(input.branchNames);
			});
			return { client: { fetchQuery } as unknown as QueryClient, fetchQuery };
		}

		const requested = (fetchQuery: ReturnType<typeof fakeClient>['fetchQuery']) =>
			fetchQuery.mock.calls.map(
				([options]) => (options.queryKey.at(-1) as { branchNames: string[] }).branchNames[0]
			);

		test('fetches every bucket once settled, nearest the viewport first', async () => {
			const names = Array.from({ length: 35 }, (_, i) => `branch-${i}`);
			const { client, fetchQuery } = fakeClient();
			const harness = setup({ names: () => names, queryClient: client });
			harness.setRange({ startIndex: 12, endIndex: 15 });

			// Nothing until the list has settled.
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS - 1);
			expect(fetchQuery).not.toHaveBeenCalled();
			expect(harness.metrics.getMetrics('branch-30')).toBeUndefined();

			await vi.advanceTimersByTimeAsync(1);
			flushSync();
			// Buckets of 10: the fill started before the range settled into
			// bucket 1, so it runs from bucket 0 outward.
			expect(requested(fetchQuery)).toEqual(['branch-0', 'branch-10', 'branch-20', 'branch-30']);
			expect(harness.metrics.getMetrics('branch-30')?.linesAdded).toBe(3);
			harness.cleanup();
		});

		test('skips a bucket that fails and carries on', async () => {
			const names = Array.from({ length: 25 }, (_, i) => `branch-${i}`);
			const { client, fetchQuery } = fakeClient((batch) => batch[0] === 'branch-10');
			const harness = setup({ names: () => names, queryClient: client });

			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS);
			flushSync();
			expect(fetchQuery).toHaveBeenCalledTimes(3);
			expect(harness.metrics.getMetrics('branch-12')).toBeUndefined();
			expect(harness.metrics.getMetrics('branch-22')?.linesAdded).toBe(3);
			harness.cleanup();
		});

		test('restarts on new names, stops when torn down, and forgets on a new repository', async () => {
			let names = $state(Array.from({ length: 25 }, (_, i) => `branch-${i}`));
			let path = $state('/repo');
			const { client, fetchQuery } = fakeClient();
			const harness = setup({ names: () => names, path: () => path, queryClient: client });

			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS);
			flushSync();
			expect(harness.metrics.getMetrics('branch-0')).toBeDefined();

			// A search narrows the list: the fill starts over for the new set.
			names = ['branch-3'];
			flushSync();
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS);
			expect(requested(fetchQuery).at(-1)).toBe('branch-3');

			// Another repository: what the fill found no longer applies.
			path = '/other';
			flushSync();
			expect(harness.metrics.getMetrics('branch-0')).toBeUndefined();

			harness.cleanup();
			const calls = fetchQuery.mock.calls.length;
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS * 2);
			expect(fetchQuery).toHaveBeenCalledTimes(calls);
		});

		test('does nothing when disabled, or without a client', async () => {
			const { client, fetchQuery } = fakeClient();
			const disabled = setup({ enabled: () => false, queryClient: client });
			const clientless = setup();
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS * 2);
			expect(fetchQuery).not.toHaveBeenCalled();
			disabled.cleanup();
			clientless.cleanup();
		});

		test('drops a bucket that resolves after the fill was cancelled', async () => {
			let release: (() => void) | undefined;
			const fetchQuery = vi.fn(
				() =>
					new Promise<BulkGetBranchMetricsOutput>((resolve) => {
						release = () => resolve(metricsOutput(['late']));
					})
			);
			const harness = setup({
				names: () => ['late'],
				queryClient: { fetchQuery } as unknown as QueryClient
			});
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS);
			expect(fetchQuery).toHaveBeenCalledTimes(1);
			harness.cleanup();
			release!();
			await vi.advanceTimersByTimeAsync(0);
			expect(harness.metrics.getMetrics('late')).toBeUndefined();
		});

		test('starts no further bucket after one fails past cancellation', async () => {
			let fail: (() => void) | undefined;
			const fetchQuery = vi.fn(
				() =>
					new Promise<BulkGetBranchMetricsOutput>((_, reject) => {
						fail = () => reject(new Error('boom'));
					})
			);
			const harness = setup({
				names: () => Array.from({ length: 25 }, (_, i) => `branch-${i}`),
				queryClient: { fetchQuery } as unknown as QueryClient
			});
			await vi.advanceTimersByTimeAsync(BACKGROUND_FILL_DELAY_MS);
			expect(fetchQuery).toHaveBeenCalledTimes(1);
			harness.cleanup();
			fail!();
			await vi.advanceTimersByTimeAsync(0);
			expect(fetchQuery).toHaveBeenCalledTimes(1);
		});
	});
});

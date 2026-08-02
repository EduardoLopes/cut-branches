import { describe, test, expect, vi } from 'vitest';
import {
	BULK_BRANCH_METRICS_GC_TIME,
	BULK_BRANCH_METRICS_STALE_TIME,
	bulkBranchMetricsQueryOptions
} from '../create-bulk-branch-metrics-query';

const executeCommand = vi.fn(() =>
	Promise.resolve({ metrics: [{ name: 'a', isMerged: true, linesAdded: 1, linesRemoved: 2 }] })
);
vi.mock('$infrastructure/tauri-commands', async (importOriginal) => ({
	...(await importOriginal<typeof import('$infrastructure/tauri-commands')>()),
	executeCommand: (...args: unknown[]) => executeCommand(...(args as []))
}));

describe('bulkBranchMetricsQueryOptions', () => {
	test('keys by the resource family + command + input', () => {
		const options = bulkBranchMetricsQueryOptions({ path: '/repo', branchNames: ['a', 'b'] });
		expect(options.queryKey).toEqual([
			'bulk-get-branch-metrics',
			'bulkGetBranchMetrics',
			{ path: '/repo', branchNames: ['a', 'b'] }
		]);
		expect(options.staleTime).toBe(BULK_BRANCH_METRICS_STALE_TIME);
		expect(options.gcTime).toBe(BULK_BRANCH_METRICS_GC_TIME);
	});

	test('is disabled without a path or without branch names', () => {
		expect(bulkBranchMetricsQueryOptions({ path: '', branchNames: ['a'] }).enabled).toBe(false);
		expect(bulkBranchMetricsQueryOptions({ path: '/repo', branchNames: [] }).enabled).toBe(false);
		expect(bulkBranchMetricsQueryOptions({ path: '/repo', branchNames: ['a'] }).enabled).toBe(true);
	});

	test('queryFn executes the bulk command with the input', async () => {
		const options = bulkBranchMetricsQueryOptions({ path: '/repo', branchNames: ['a'] });
		const result = await options.queryFn();
		expect(executeCommand).toHaveBeenCalledWith('bulkGetBranchMetrics', {
			path: '/repo',
			branchNames: ['a']
		});
		expect(result.metrics[0]?.name).toBe('a');
	});
});

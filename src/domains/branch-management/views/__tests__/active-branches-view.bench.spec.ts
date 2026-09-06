/**
 * BENCHMARK — measurement, not an assertion. Opt-in.
 *
 * Run with:  VITE_BENCH=1 pnpm test -- src/domains/branch-management/views
 * Optionally: VITE_BENCH_BRANCHES=1000 VITE_BENCH=1 pnpm test -- ...
 *
 * Skipped by default so it doesn't slow the normal suite or pollute coverage.
 *
 * Mounts the *whole* active-branches view (not just BranchList) against real
 * TanStack queries with only the Tauri command layer mocked, so the converter,
 * derivation and IPC-payload costs are all included. Reports:
 *   - distinct Tauri calls (duplicate `getBranchList` keys show up here)
 *   - `longtask` entries: main-thread blocks >50ms, i.e. what a freeze *is*
 */
import { tick } from 'svelte';
import { vi, describe, test } from 'vitest';
import ActiveBranchesView from '../active-branches-view.svelte';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

const BRANCH_COUNT = Number(import.meta.env.VITE_BENCH_BRANCHES ?? 300);

const branchData = Array.from({ length: BRANCH_COUNT }, (_, i) =>
	mockDataFactory.branch({ name: `feature/branch-${i + 1}`, current: i === 0 })
);

vi.mock('$infrastructure/bindings', async () => {
	const actual = await vi.importActual<typeof import('$infrastructure/bindings')>(
		'$infrastructure/bindings'
	);
	return {
		...actual,
		commands: new Proxy(
			{},
			{
				get: (_t, name: string) => {
					return vi.fn(async (input: unknown) => {
						// Recorded on the module-level `counts` via globalThis so the
						// test body can read it (vi.mock factories are hoisted).
						const g = globalThis as unknown as { __benchCounts: Record<string, number> };
						g.__benchCounts ??= {};
						const key = `${name}:${JSON.stringify(input)}`;
						g.__benchCounts[key] = (g.__benchCounts[key] ?? 0) + 1;

						const g2 = globalThis as unknown as { __benchBranches: unknown[] };
						// Real Tauri IPC hands the webview a JSON string that must be
						// parsed on the main thread. Returning live objects (as a naive
						// mock does) makes payload size free and hides the dominant
						// cost of fetching three full branch arrays. Round-trip to
						// restore that cost.
						const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value));
						switch (name) {
							case 'getBranchList':
								return wire({ status: 'ok' as const, data: { branches: g2.__benchBranches } });
							case 'getRepository':
								return wire({
									status: 'ok' as const,
									data: {
										path: '/repo',
										branches: g2.__benchBranches,
										currentBranch: 'feature/branch-1',
										branchesCount: (g2.__benchBranches as unknown[]).length,
										name: 'repo',
										id: 'repo1',
										lastSyncedAt: null,
										isWorktree: false
									}
								});
							case 'listLockedBranches':
								return { status: 'ok' as const, data: { branches: [] } };
							case 'bulkGetBranchMetrics':
								return { status: 'ok' as const, data: { metrics: [] } };
							case 'getRepositoryList':
								return {
									status: 'ok' as const,
									data: [
										{ id: 'repo1', name: 'repo', path: '/repo', currentBranch: 'feature/branch-1' }
									]
								};
							default:
								return { status: 'ok' as const, data: {} };
						}
					});
				}
			}
		)
	};
});

vi.mock('$app/state', () => ({
	page: { url: { pathname: '/repos/repo1' }, params: { id: 'repo1' } }
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: vi.fn() }
}));

async function settle(frames = 20) {
	for (let i = 0; i < frames; i++) {
		await tick();
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
}

describe.skipIf(!import.meta.env.VITE_BENCH)('ActiveBranchesView mount cost', () => {
	for (let run = 0; run < 5; run++) {
		test(`run ${run}`, async () => {
			const g = globalThis as unknown as {
				__benchBranches: unknown[];
				__benchCounts: Record<string, number>;
			};
			g.__benchBranches = branchData;
			g.__benchCounts = {};

			const style = document.createElement('style');
			style.textContent = `body { margin: 0 } body > div { height: 800px; display: flex; flex-direction: column; min-height: 0 }`;
			document.head.appendChild(style);

			// Long tasks are the actual definition of a freeze: any main-thread
			// block over 50ms. This is what the user perceives, and it is not
			// visible in wall-clock totals (which are dominated by the settle loop).
			const longTasks: number[] = [];
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) longTasks.push(entry.duration);
			});
			observer.observe({ entryTypes: ['longtask'] });

			const start = performance.now();
			const screen = await renderWithTestWrapper(ActiveBranchesView, { id: 'repo1' });
			const syncMs = performance.now() - start;
			await settle();
			const totalMs = performance.now() - start;
			observer.disconnect();
			const blockedMs = longTasks.reduce((a, b) => a + b, 0);
			console.log(
				`[BENCH2] longTasks=[${longTasks.map((d) => d.toFixed(0)).join(',')}] totalBlocked=${blockedMs.toFixed(0)}ms`
			);

			const rows = document.querySelectorAll('[role="listitem"]').length;
			const ipc = Object.entries(g.__benchCounts)
				.map(([k, v]) => `\n    ${v}× ${k}`)
				.join('');

			console.log(
				`[BENCH2] n=${BRANCH_COUNT} sync=${syncMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms rows=${rows} ipcCalls=${Object.keys(g.__benchCounts).length} [${ipc}]`
			);

			screen.unmount();
			await settle(3);
		});
	}
});

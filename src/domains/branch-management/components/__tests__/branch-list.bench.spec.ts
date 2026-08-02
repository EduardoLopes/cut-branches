/**
 * BENCHMARK — measurement, not an assertion. Opt-in.
 *
 * Run with:  VITE_BENCH=1 pnpm test -- src/domains/branch-management/components
 *
 * Skipped by default so it doesn't slow the normal suite or pollute coverage.
 *
 * Isolates the branch list's mount and teardown cost. `syncRender` is the
 * number that matters: it is the blocking main-thread work between navigating
 * and the first paint, i.e. the freeze. `mountedRows` explains it — each row is
 * a card, a nested panel, badges, icons, a popover anchor and a lock toggle
 * with its own query observer, measured at roughly 3-4ms apiece.
 *
 * Reference numbers (Chromium/Playwright, 200 branches, median of 5 after
 * discarding warmup) from when the initial overscan was introduced:
 *   before (lead 16 on arrival): 22 rows, syncRender 75ms
 *   after  (lead 3 until scroll):  9 rows, syncRender 31ms
 */
import { tick } from 'svelte';
import { vi, describe, test } from 'vitest';
import BranchList from '../branch-list.svelte';
import { branchesHolder } from './reactive-branches.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', async () => {
	const { branchesHolder: holder } = await import('./reactive-branches.svelte');
	return {
		createGetBranchesQuery: () => ({
			get data() {
				return { branches: holder.value };
			},
			isLoading: false,
			isError: false,
			error: null
		})
	};
});

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation',
	() => ({
		createSwitchBranchMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null })
	})
);

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation',
	() => ({
		createUpdateBranchSelectionBatchMutation: () => ({ mutate: vi.fn(), isPending: false })
	})
);

vi.mock('$domains/branch-management/infrastructure/queries/create-locked-branches-query', () => ({
	createLockedBranchesQuery: () => ({ data: { branches: [] }, isLoading: false })
}));

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-add-locked-branches-mutation',
	() => ({ createAddLockedBranchesMutation: () => ({ mutate: vi.fn(), isPending: false }) })
);

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-remove-locked-branches-mutation',
	() => ({ createRemoveLockedBranchesMutation: () => ({ mutate: vi.fn(), isPending: false }) })
);

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: vi.fn() }
}));

vi.mock('$domains/branch-management/core/composables/use-branch-metrics.svelte', () => ({
	useBranchMetrics: () => ({
		getMetrics: () => ({ isMerged: false, linesAdded: 3, linesRemoved: 1 }),
		isLoading: false
	})
}));

vi.mock('$app/state', () => ({
	page: { url: { pathname: '/repos/repo1' } }
}));

function makeBranches(count: number) {
	return Array.from({ length: count }, (_, i) =>
		Branch.fromData(mockDataFactory.branch({ name: `branch-${i + 1}`, current: i === 0 }))
	);
}

async function settle() {
	for (let i = 0; i < 12; i++) {
		await tick();
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
}

describe.skipIf(!import.meta.env.VITE_BENCH)('BranchList mount/teardown cost', () => {
	// Repeated so warmup (first run, ~2-4x slower) can be discarded by eye.
	for (let run = 0; run < 6; run++) {
		test(`run ${run}`, async () => {
			branchesHolder.value = makeBranches(200);

			// The real list sits inside a PageWell bounded by the window
			// (`flex: 1; min-height: 0`). Without that the scroll port grows to the
			// full content height and the virtualizer mounts everything — a bench
			// artifact that makes the list look unvirtualized. Pin a real viewport.
			const style = document.createElement('style');
			style.textContent = `
				body { margin: 0; }
				body > div { height: 800px; display: flex; flex-direction: column; min-height: 0; }
			`;
			document.head.appendChild(style);

			const mountStart = performance.now();
			const screen = renderWithTestWrapper(BranchList, {
				repositoryID: 'repo1',
				repositoryPath: '/repo1',
				allowLocking: true,
				allowSelection: true,
				allowSetCurrent: true
			});
			// The synchronous render — the part that blocks the UI thread.
			const syncMs = performance.now() - mountStart;
			await settle();

			const rows = document.querySelectorAll('[role="listitem"]').length;
			const port = document.querySelector('[data-testid="branch-list-scroller"]');
			const rowH = document.querySelector('[role="listitem"]')?.getBoundingClientRect().height ?? 0;

			const unmountStart = performance.now();
			screen.unmount();
			const unmountMs = performance.now() - unmountStart;
			await settle();

			console.log(
				`[BENCH] rows=${rows} syncRender=${syncMs.toFixed(1)}ms unmount=${unmountMs.toFixed(1)}ms ` +
					`portH=${port?.clientHeight ?? 0} rowH=${rowH.toFixed(0)} (estimate ${148})`
			);
		});
	}
});

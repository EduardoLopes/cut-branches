import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BranchContextFilter from '../branch-context-filter.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

/**
 * Choice renders each item as a `<label>` wrapping the real radio. Clicking the
 * label is what a user does, but the synthetic click doesn't always forward to
 * the control, so drive the input directly.
 */
function clickFilter(container: HTMLElement, testId: string) {
	container.querySelector<HTMLInputElement>(`[data-testid="${testId}"] input`)?.click();
}

const h = vi.hoisted(() => ({
	pathname: '/repos/r1',
	activeCount: 12,
	deletedCount: 3,
	goto: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => h.goto(...args) }));
// The getters live ON the `page` object, not on the module namespace: vitest
// snapshots a mock factory's exports, so a namespace-level getter would freeze
// at its first value and no test could change the route.
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return { pathname: h.pathname };
		},
		get params() {
			return { id: 'r1' };
		}
	}
}));
vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: (getInput: () => { filters?: { deletionStatus?: string } }) => ({
		get data() {
			const deleted = getInput().filters?.deletionStatus === 'deleted';
			return {
				branches: new Array(deleted ? h.deletedCount : h.activeCount).fill(null)
			};
		}
	})
}));

beforeEach(() => {
	h.pathname = '/repos/r1';
	h.activeCount = 12;
	h.deletedCount = 3;
	h.goto.mockReset();
});

describe('BranchContextFilter', () => {
	it('renders both filters with their counts', async () => {
		const screen = await renderWithTestWrapper(BranchContextFilter, { repositoryId: 'r1' });
		await tick();

		await expect.element(screen.getByTestId('branch-context-filter')).toBeInTheDocument();
		await expect.element(screen.getByTestId('filter-active-count')).toHaveTextContent('12');
		await expect.element(screen.getByTestId('filter-deleted-count')).toHaveTextContent('3');
	});

	it('navigates to the restore route when selecting Deleted', async () => {
		const screen = await renderWithTestWrapper(BranchContextFilter, { repositoryId: 'r1' });
		await tick();

		clickFilter(screen.container, 'filter-deleted');
		expect(h.goto).toHaveBeenCalledWith('/repos/r1/restore');
	});

	it('navigates back to the branches route when selecting Active', async () => {
		h.pathname = '/repos/r1/restore';
		const screen = await renderWithTestWrapper(BranchContextFilter, { repositoryId: 'r1' });
		await tick();

		clickFilter(screen.container, 'filter-active');
		expect(h.goto).toHaveBeenCalledWith('/repos/r1');
	});

	it('does not navigate when re-selecting the active filter', async () => {
		const screen = await renderWithTestWrapper(BranchContextFilter, { repositoryId: 'r1' });
		await tick();

		clickFilter(screen.container, 'filter-active');
		expect(h.goto).not.toHaveBeenCalled();
	});
});

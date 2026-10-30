import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Worktree } from '../../core/models/worktree';
import WorktreesView from '../worktrees-view.svelte';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	view: undefined as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	actions: undefined as any
}));

vi.mock('$infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		get data() {
			return { id: 'r1', name: 'repo', path: '/repo' };
		}
	})
}));
vi.mock('../../core/composables/use-worktrees-view.svelte', () => ({
	useWorktreesView: () => h.view
}));
vi.mock('../../core/composables/use-worktree-actions.svelte', () => ({
	useWorktreeActions: () => h.actions
}));

function wt(name: string, overrides: Partial<WorktreeData> = {}): Worktree {
	return Worktree.fromData({
		name,
		path: `/repos/${name}`,
		branch: name,
		headSha: 'abc1234',
		isLocked: false,
		lockReason: null,
		isMain: false,
		isPrunable: false,
		...overrides
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeView(worktrees: Worktree[], overrides: Record<string, any> = {}) {
	return {
		worktrees,
		linkedCount: worktrees.filter((w) => !w.isMain()).length,
		isLoading: false,
		isError: false,
		error: null,
		...overrides
	};
}

function makeActions() {
	return {
		isRemoving: false,
		isLocking: false,
		isUnlocking: false,
		remove: vi.fn(() => Promise.resolve()),
		removeMany: vi.fn(() => Promise.resolve({ ok: 1, failed: [] })),
		lock: vi.fn(() => Promise.resolve()),
		unlock: vi.fn(() => Promise.resolve())
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	h.view = makeView([wt('main', { isMain: true }), wt('a')]);
	h.actions = makeActions();
});

describe('WorktreesView', () => {
	it('renders the worktrees and the selection summary', async () => {
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		expect(screen.container.querySelectorAll('[data-testid="worktree-row"]')).toHaveLength(2);
		await expect
			.element(screen.getByTestId('worktrees-selection-count'))
			.toMatchTextContent('0 of 1');
	});

	it('filters worktrees by the search term', async () => {
		h.view = makeView([wt('main', { isMain: true }), wt('alpha'), wt('beta')]);
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		await screen.getByTestId('worktrees-search').fill('alph');
		await tick();
		expect(screen.container.querySelectorAll('[data-testid="worktree-row"]')).toHaveLength(1);
		await expect.element(screen.getByTestId('worktree-row')).toMatchTextContent('alpha');
	});

	it('locks a worktree from a row', async () => {
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		await screen.getByTestId('worktree-lock').click();
		expect(h.actions.lock).toHaveBeenCalledWith('a');
	});

	it('bulk-deletes selected worktrees from the bulk bar, through the confirm modal', async () => {
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		await screen.getByRole('row').filter({ hasText: '/repos/a' }).getByRole('checkbox').click();
		await tick();

		const bar = screen.getByRole('toolbar', { name: 'Worktree actions' });
		await expect.element(bar).toHaveAttribute('data-open', 'true');
		// The test frame is narrow: the bar folds Delete into "More".
		await bar.getByRole('button', { name: 'More' }).click();
		await screen.getByRole('menuitem', { name: 'Delete' }).click();
		await tick();

		await screen.getByTestId('delete-worktrees-confirm').click();
		await vi.waitFor(() => expect(h.actions.removeMany).toHaveBeenCalledWith(['a'], false));
	});

	it('keeps the bulk bar closed while nothing is selected', async () => {
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		expect(screen.getByTestId('worktrees-bulk-bar')).toHaveAttribute('data-open', 'false');
		expect(h.actions.removeMany).not.toHaveBeenCalled();
	});

	it('the bulk bar selects every selectable worktree and clears the selection', async () => {
		h.view = makeView([wt('main', { isMain: true }), wt('a'), wt('b')]);
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });
		await tick();

		await screen.getByRole('row').filter({ hasText: '/repos/a' }).getByRole('checkbox').click();
		const bar = screen.getByRole('toolbar', { name: 'Worktree actions' });
		// Narrow frame: "Select all N" moves into "More" with the actions.
		await bar.getByRole('button', { name: 'More' }).click();
		await screen.getByRole('menuitem', { name: /Select all 2/ }).click();
		await expect
			.element(screen.getByTestId('worktrees-selection-count'))
			.toMatchTextContent('2 of 2');

		await bar.getByRole('button', { name: /Clear selection/ }).click();
		await expect
			.element(screen.getByTestId('worktrees-selection-count'))
			.toMatchTextContent('0 of 2');
	});
});

import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchBulkBar from '../branch-bulk-bar.svelte';
import type { Repository } from '$types/repository';
import { renderWithTestWrapper } from '$utils/test-utils';

const selection = {
	selectedCount: 0,
	selectibleCount: 0,
	clearSelection: vi.fn(async () => {}),
	selectAll: vi.fn(async () => {})
};

vi.mock('$domains/branch-management/core/composables/use-branch-selection.svelte', () => ({
	useBranchSelection: () => selection
}));

const repository = { id: 'repo-1', name: 'repo-1' } as Repository;

type Screen = Awaited<ReturnType<typeof renderWithTestWrapper>>;

function bar(screen: Screen) {
	return screen.getByRole('toolbar', { name: 'Branch actions' });
}

// The test frame is narrow, so the bar folds its labelled action into "More" —
// which lists every action whatever the width.
async function pick(screen: Screen, label: string) {
	await bar(screen).getByRole('button', { name: 'More' }).click();
	await screen.getByRole('menuitem', { name: label }).click();
}

describe('BranchBulkBar', () => {
	beforeEach(() => {
		selection.selectedCount = 0;
		selection.selectibleCount = 0;
		vi.clearAllMocks();
	});

	test('stays closed while nothing is selected', async () => {
		const screen = await renderWithTestWrapper(BranchBulkBar, {
			repository,
			branchContext: 'active',
			onAction: vi.fn()
		});

		// Hidden, not removed: it stays mounted for its announcements.
		expect(screen.getByTestId('branch-bulk-bar')).toHaveAttribute('data-open', 'false');
	});

	test('offers Delete for active branches and reports it', async () => {
		selection.selectedCount = 2;
		selection.selectibleCount = 5;
		const onAction = vi.fn();
		const screen = await renderWithTestWrapper(BranchBulkBar, {
			repository,
			branchContext: 'active',
			onAction
		});

		await expect
			.element(bar(screen).getByRole('button', { name: '2 selected. Clear selection' }))
			.toBeVisible();
		await pick(screen, 'Delete');

		expect(onAction).toHaveBeenCalledOnce();
	});

	test('offers Restore for deleted branches', async () => {
		selection.selectedCount = 1;
		selection.selectibleCount = 3;
		const onAction = vi.fn();
		const screen = await renderWithTestWrapper(BranchBulkBar, {
			repository,
			branchContext: 'deleted',
			onAction
		});

		await pick(screen, 'Restore');

		expect(onAction).toHaveBeenCalledOnce();
		expect(screen.getByRole('menuitem', { name: 'Delete' }).elements()).toHaveLength(0);
	});

	test('the count chip clears the selection and "Select all" selects every selectable branch', async () => {
		selection.selectedCount = 2;
		selection.selectibleCount = 5;
		const screen = await renderWithTestWrapper(BranchBulkBar, {
			repository,
			branchContext: 'active',
			onAction: vi.fn()
		});

		await bar(screen)
			.getByRole('button', { name: /Select all 5/ })
			.click();
		expect(selection.selectAll).toHaveBeenCalledOnce();

		await bar(screen)
			.getByRole('button', { name: /Clear selection/ })
			.click();
		await tick();
		expect(selection.clearSelection).toHaveBeenCalledOnce();
	});
});

import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { Worktree } from '../../core/models/worktree';
import DeleteWorktreesModal from '../delete-worktrees-modal.svelte';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

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

describe('DeleteWorktreesModal', () => {
	it('confirms deletion without force when nothing is locked', async () => {
		const onConfirm = vi.fn();
		const screen = renderWithTestWrapper(DeleteWorktreesModal, {
			open: true,
			worktrees: [wt('a'), wt('b')],
			onConfirm
		});
		await tick();

		expect(screen.container.querySelector('[data-testid="delete-worktrees-force"]')).toBeNull();
		await screen.getByTestId('delete-worktrees-confirm').click();
		expect(onConfirm).toHaveBeenCalledWith(false);
	});

	it('offers force when a selected worktree is locked and passes it through', async () => {
		const onConfirm = vi.fn();
		const screen = renderWithTestWrapper(DeleteWorktreesModal, {
			open: true,
			worktrees: [wt('a'), wt('b', { isLocked: true })],
			onConfirm
		});
		await tick();

		await screen.getByTestId('delete-worktrees-force').click();
		await screen.getByTestId('delete-worktrees-confirm').click();
		expect(onConfirm).toHaveBeenCalledWith(true);
	});

	it('disables the confirm button while deleting', async () => {
		const onConfirm = vi.fn();
		const screen = renderWithTestWrapper(DeleteWorktreesModal, {
			open: true,
			worktrees: [wt('a')],
			isDeleting: true,
			onConfirm
		});
		await tick();

		await expect.element(screen.getByTestId('delete-worktrees-confirm')).toBeDisabled();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});

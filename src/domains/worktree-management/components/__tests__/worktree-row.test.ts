import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import { Worktree } from '../../core/models/worktree';
import WorktreeRow from '../worktree-row.svelte';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

function wt(overrides: Partial<WorktreeData> = {}): Worktree {
	return Worktree.fromData({
		name: 'wt1',
		path: '/repos/wt1',
		branch: 'feature',
		headSha: 'abc1234567',
		isLocked: false,
		lockReason: null,
		isMain: false,
		isPrunable: false,
		...overrides
	});
}

function render(worktree: Worktree) {
	return renderWithTestWrapper(WorktreeRow, { worktree });
}

describe('WorktreeRow', () => {
	it('shows the name, branch and short sha', async () => {
		const screen = render(wt());
		await tick();
		await expect.element(screen.getByTestId('worktree-name')).toHaveTextContent('wt1');
		await expect.element(screen.getByTestId('worktree-row')).toHaveTextContent('feature');
		await expect.element(screen.getByTestId('worktree-row')).toHaveTextContent('abc1234');
	});

	it('marks the main and locked worktrees', async () => {
		const main = render(wt({ isMain: true, name: 'repo' }));
		await tick();
		await expect.element(main.getByTestId('worktree-main-badge')).toBeInTheDocument();
		main.unmount();

		const locked = render(wt({ isLocked: true, lockReason: 'busy' }));
		await tick();
		await expect.element(locked.getByTestId('worktree-locked-badge')).toBeInTheDocument();
	});

	it('marks a prunable worktree', async () => {
		const screen = render(wt({ isPrunable: true }));
		await tick();
		await expect.element(screen.getByTestId('worktree-prunable-badge')).toBeInTheDocument();
	});

	it('shows the short sha for a detached HEAD and "detached" when there is no branch', async () => {
		const shaOnly = render(wt({ branch: null }));
		await tick();
		await expect.element(shaOnly.getByTestId('worktree-row')).toHaveTextContent('detached');
		await expect.element(shaOnly.getByTestId('worktree-row')).toHaveTextContent('abc1234');
		shaOnly.unmount();

		const missing = render(wt({ branch: null, headSha: null }));
		await tick();
		await expect.element(missing.getByTestId('worktree-row')).toHaveTextContent('detached');
	});
});

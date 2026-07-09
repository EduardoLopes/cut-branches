import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { Worktree } from '../../core/models/worktree';
import WorktreeList from '../worktree-list.svelte';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

function wt(name: string, isMain = false): Worktree {
	const data: WorktreeData = {
		name,
		path: `/repos/${name}`,
		branch: name,
		headSha: 'abc1234',
		isLocked: false,
		lockReason: null,
		isMain,
		isPrunable: false
	};
	return Worktree.fromData(data);
}

function render(props: Partial<Parameters<typeof WorktreeList>[1]> & { worktrees: Worktree[] }) {
	return renderWithTestWrapper(WorktreeList, {
		onLock: vi.fn(),
		onUnlock: vi.fn(),
		...props
	});
}

describe('WorktreeList', () => {
	it('shows a loading state', async () => {
		const screen = render({ worktrees: [], isLoading: true });
		await tick();
		await expect.element(screen.getByTestId('worktree-list-loading')).toBeInTheDocument();
	});

	it('shows an empty state when there are no worktrees', async () => {
		const screen = render({ worktrees: [], isLoading: false });
		await tick();
		await expect.element(screen.getByTestId('worktree-list-empty')).toBeInTheDocument();
	});

	it('renders one row per worktree', async () => {
		const screen = render({ worktrees: [wt('main', true), wt('a'), wt('b')], isLoading: false });
		await tick();
		expect(screen.container.querySelectorAll('[data-testid="worktree-row"]')).toHaveLength(3);
	});

	it('locks a worktree from the left rail', async () => {
		const onLock = vi.fn();
		const worktree = wt('a');
		const screen = render({ worktrees: [worktree], isLoading: false, onLock });
		await tick();
		await screen.getByTestId('worktree-lock').click();
		expect(onLock).toHaveBeenCalledWith(worktree);
	});

	it('unlocks a locked worktree from the left rail', async () => {
		const onUnlock = vi.fn();
		const locked = Worktree.fromData({ ...wt('a').toData(), isLocked: true });
		const screen = render({ worktrees: [locked], isLoading: false, onUnlock });
		await tick();
		await screen.getByTestId('worktree-unlock').click();
		expect(onUnlock).toHaveBeenCalledWith(locked);
	});

	it('shows selection checkboxes for linked worktrees when enabled, but not the main worktree', async () => {
		const onToggleSelect = vi.fn();
		const main = wt('main', true);
		const linked = wt('a');
		const screen = render({
			worktrees: [main, linked],
			isLoading: false,
			allowSelection: true,
			isSelected: () => false,
			onToggleSelect
		});
		await tick();
		expect(screen.container.querySelector('[data-testid="worktree-select-main"]')).toBeNull();
		await screen.getByTestId('worktree-select-a').click();
		expect(onToggleSelect).toHaveBeenCalledWith(linked);
	});
});

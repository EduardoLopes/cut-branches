import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Worktree } from '../../models/worktree';
import { useWorktreesView } from '../use-worktrees-view.svelte';
import type { AppError, Worktree as WorktreeData } from '$infrastructure/bindings';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { holder } = vi.hoisted(() => ({
	holder: { query: null as unknown }
}));

vi.mock('@tanstack/svelte-query', () => ({ useQueryClient: () => ({}) }));
vi.mock('../../../infrastructure/queries/create-list-worktrees-query', () => ({
	createListWorktreesQuery: () => holder.query
}));

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

beforeEach(() => {
	holder.query = null;
});

describe('useWorktreesView', () => {
	it('exposes worktrees and counts only linked ones', () => {
		holder.query = {
			data: { worktrees: [wt('main', true), wt('a'), wt('b')] },
			isLoading: false,
			isError: false,
			error: null
		};
		const { value: view, cleanup } = withEffectRoot(() =>
			useWorktreesView({ getPath: () => '/repos/main' })
		);
		flushSync();

		expect(view.worktrees).toHaveLength(3);
		expect(view.linkedCount).toBe(2);
		expect(view.isLoading).toBe(false);
		expect(view.isError).toBe(false);
		expect(view.error).toBeNull();
		cleanup();
	});

	it('defaults to an empty list while loading', () => {
		holder.query = { data: undefined, isLoading: true, isError: false, error: null };
		const { value: view, cleanup } = withEffectRoot(() =>
			useWorktreesView({ getPath: () => '/repos/main' })
		);
		flushSync();

		expect(view.worktrees).toEqual([]);
		expect(view.linkedCount).toBe(0);
		expect(view.isLoading).toBe(true);
		cleanup();
	});

	it('surfaces query errors', () => {
		const error: AppError = { message: 'boom', kind: 'worktree_list_failed', description: null };
		holder.query = { data: undefined, isLoading: false, isError: true, error };
		const { value: view, cleanup } = withEffectRoot(() =>
			useWorktreesView({ getPath: () => '/repos/main' })
		);
		flushSync();

		expect(view.isError).toBe(true);
		expect(view.error).toEqual(error);
		cleanup();
	});
});

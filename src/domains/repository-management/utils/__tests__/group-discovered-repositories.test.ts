import { describe, expect, test } from 'vitest';
import type { DiscoveredItem } from '../../core/composables/use-discover-repositories.svelte';
import { groupDiscoveredRepositories } from '../group-discovered-repositories';

function repo(path: string, extra: Partial<DiscoveredItem> = {}): DiscoveredItem {
	return {
		path,
		name: path.split('/').pop() ?? path,
		alreadyAdded: false,
		isWorktree: false,
		mainRepositoryPath: null,
		...extra
	};
}

function worktree(path: string, mainRepositoryPath: string | null): DiscoveredItem {
	return repo(path, { isWorktree: true, mainRepositoryPath });
}

describe('groupDiscoveredRepositories', () => {
	test('keeps plain repositories as top-level groups in order', () => {
		const a = repo('/a');
		const b = repo('/b');
		expect(groupDiscoveredRepositories([b, a])).toEqual([
			{ item: b, worktrees: [] },
			{ item: a, worktrees: [] }
		]);
	});

	test('nests worktrees under their main repository, ignoring trailing slashes', () => {
		const main = repo('/main');
		const first = worktree('/wt/one', '/main/');
		const second = worktree('/wt/two', '/main');
		const other = repo('/other');
		expect(groupDiscoveredRepositories([main, other, first, second])).toEqual([
			{ item: main, worktrees: [first, second] },
			{ item: other, worktrees: [] }
		]);
	});

	test('lifts an added repository above other added ones while its worktrees can still be added', () => {
		const addedAlone = repo('/added', { alreadyAdded: true });
		const addedMain = repo('/main', { alreadyAdded: true });
		const pending = worktree('/main-wt', '/main');
		const fresh = repo('/fresh');
		// The composable sinks added items to the end; the grouping must pull
		// `/main` back above `/added` because `/main-wt` is still addable.
		expect(groupDiscoveredRepositories([fresh, pending, addedAlone, addedMain])).toEqual([
			{ item: fresh, worktrees: [] },
			{ item: addedMain, worktrees: [pending] },
			{ item: addedAlone, worktrees: [] }
		]);
	});

	test('keeps a worktree at the top level when its repository is not in the list', () => {
		const orphan = worktree('/wt/lost', '/elsewhere');
		const unknown = worktree('/wt/unknown', null);
		const main = repo('/main');
		expect(groupDiscoveredRepositories([orphan, main, unknown])).toEqual([
			{ item: orphan, worktrees: [] },
			{ item: main, worktrees: [] },
			{ item: unknown, worktrees: [] }
		]);
	});
});

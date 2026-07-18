import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryCommit } from '../../models/commit-graph';
import { useCommitHistoryView } from '../use-commit-history-view.svelte';
import { reactiveHolder } from './reactive-holder.svelte';
import type { AppError } from '$infrastructure/bindings';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

// --- Fixtures ----------------------------------------------------------------

const commit = (sha: string, parents: string[], localBranch?: string): HistoryCommit => ({
	sha,
	shortSha: sha.slice(0, 7),
	parents,
	refs: localBranch ? [{ name: localBranch, kind: 'localBranch' }] : [],
	author: 'Test User',
	email: 'test@example.com',
	date: 'Mon Jan  1 00:00:00 2024 +0000',
	message: `commit ${sha}`
});

/** Linear chain c0 → c1 → … (c0 newest, head of `main`). */
const chain = (count: number, from = 0): HistoryCommit[] =>
	Array.from({ length: count }, (_, k) => {
		const i = from + k;
		return commit(`c${i}`, [`c${i + 1}`], i === 0 ? 'main' : undefined);
	});

interface FakeBranch {
	getName: () => string;
	getIsSelected: () => boolean;
	getIsLocked: () => boolean;
	isCurrent: () => boolean;
}

const branch = (
	name: string,
	{ selected = false, locked = false, current = false } = {}
): FakeBranch => ({
	getName: () => name,
	getIsSelected: () => selected,
	getIsLocked: () => locked,
	isCurrent: () => current
});

interface HistoryPageData {
	commits: HistoryCommit[];
	nextCursor: string | null;
	totalCount: number;
}

interface HistoryQueryState {
	data: { pages: HistoryPageData[] } | undefined;
	dataUpdatedAt: number;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isLoading: boolean;
	isError: boolean;
	error: AppError | null;
}

// --- Module mocks ---------------------------------------------------------------

const { holders, spies } = vi.hoisted(() => ({
	holders: {
		repository: null as unknown,
		history: null as unknown,
		branches: null as unknown
	},
	spies: {
		fetchNextPage: vi.fn(),
		mutate: vi.fn(),
		fetchCommitLocation: vi.fn(),
		fetchBranchComparisonBatch: vi.fn(async () => ({
			baseName: 'main',
			baseSha: 'b',
			branches: []
		})),
		resetQueries: vi.fn()
	}
}));

type Holder<T> = { value: T };

vi.mock('@tanstack/svelte-query', () => ({
	useQueryClient: () => ({ resetQueries: spies.resetQueries })
}));
vi.mock('$domains/branch-management/infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		get data() {
			return (holders.repository as Holder<{ path?: string } | undefined>).value;
		}
	})
}));
vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-list-commit-history-infinite-query',
	() => ({
		createListCommitHistoryInfiniteQuery: () => {
			const holder = holders.history as Holder<HistoryQueryState>;
			return {
				get data() {
					return holder.value.data;
				},
				get dataUpdatedAt() {
					return holder.value.dataUpdatedAt;
				},
				get hasNextPage() {
					return holder.value.hasNextPage;
				},
				get isFetchingNextPage() {
					return holder.value.isFetchingNextPage;
				},
				get isLoading() {
					return holder.value.isLoading;
				},
				get isError() {
					return holder.value.isError;
				},
				get error() {
					return holder.value.error;
				},
				fetchNextPage: spies.fetchNextPage
			};
		}
	})
);
vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: () => ({
		get data() {
			return (holders.branches as Holder<{ branches: FakeBranch[] } | undefined>).value;
		}
	})
}));
vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation',
	() => ({
		createUpdateBranchSelectionBatchMutation: () => ({ mutate: spies.mutate })
	})
);
vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-get-commit-history-window-query',
	() => ({
		fetchCommitLocation: spies.fetchCommitLocation
	})
);
vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-list-branch-comparison-query',
	() => ({
		fetchBranchComparisonBatch: spies.fetchBranchComparisonBatch
	})
);

// --- Setup ---------------------------------------------------------------------

const page = (commits: HistoryCommit[], nextCursor: string | null, totalCount: number) => ({
	commits,
	nextCursor,
	totalCount
});

function setup({
	pages = [page(chain(3), null, 3)],
	branches = [branch('main', { current: true })],
	targetCommit = null as string | null,
	hasNextPage = false
} = {}) {
	const historyHolder = reactiveHolder<HistoryQueryState>({
		data: { pages },
		dataUpdatedAt: 1,
		hasNextPage,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
		error: null
	});
	const repositoryHolder = reactiveHolder<{ path?: string } | undefined>({ path: '/repo' });
	const branchesHolder = reactiveHolder<{ branches: FakeBranch[] } | undefined>({ branches });
	const targetHolder = reactiveHolder<string | null>(targetCommit);

	holders.history = historyHolder;
	holders.repository = repositoryHolder;
	holders.branches = branchesHolder;

	const root = withEffectRoot(() =>
		useCommitHistoryView({
			getId: () => 'repo-1',
			getTargetCommit: () => targetHolder.value
		})
	);
	flushSync();

	return { root, view: root.value, historyHolder, repositoryHolder, branchesHolder, targetHolder };
}

beforeEach(() => {
	spies.fetchNextPage.mockReset();
	spies.mutate.mockReset();
	spies.fetchCommitLocation.mockReset();
	spies.resetQueries.mockReset();
});

// --- Tests -----------------------------------------------------------------------

describe('useCommitHistoryView layout', () => {
	it('lays out loaded pages into display rows', () => {
		const { view, root } = setup();

		expect(view.loadedCommitCount).toBe(3);
		expect(view.totalCount).toBe(3);
		expect(view.laneCount).toBe(1);
		// c0 is a branch head; c1+c2 fold into a run hosted by the c0 row.
		expect(view.display.map((d) => d.t)).toEqual(['commit']);
		const head = view.display[0];
		expect(head.t === 'commit' && head.runBelow).toEqual({
			groupId: 'c1',
			count: 2,
			collapsed: true
		});
		root.cleanup();
	});

	it('appends new pages without recreating previously laid-out rows', () => {
		const { view, historyHolder, root } = setup({
			pages: [page(chain(3), 'cur:3', 10)],
			hasNextPage: true
		});

		const first = view.display[0];
		if (first.t !== 'commit') throw new Error('expected a commit row');
		const firstRow = first.row;

		historyHolder.value = {
			...historyHolder.value,
			data: { pages: [...historyHolder.value.data!.pages, page(chain(3, 3), null, 10)] },
			dataUpdatedAt: 2,
			hasNextPage: false
		};
		flushSync();

		expect(view.loadedCommitCount).toBe(6);
		// The display refolds, but it still wraps the SAME laid-out row object —
		// older pages are never re-run through the graph walk.
		const firstAfter = view.display[0];
		expect(firstAfter.t === 'commit' && firstAfter.row).toBe(firstRow);
		root.cleanup();
	});

	it('relays out from scratch when a refetch replaces the loaded pages', () => {
		const { view, historyHolder, root } = setup();
		expect(view.display[0].t).toBe('commit');

		// Same page count, new timestamp, different content = invalidation refetch.
		const fresh = [commit('n0', ['n1'], 'main'), commit('n1', ['n2']), commit('n2', ['n3'])];
		historyHolder.value = {
			...historyHolder.value,
			data: { pages: [page(fresh, null, 3)] },
			dataUpdatedAt: 99
		};
		flushSync();

		const first = view.display[0];
		expect(first.t === 'commit' && first.row.commit.sha).toBe('n0');
		root.cleanup();
	});

	it('toggles collapsed runs open and closed', () => {
		const { view, root } = setup();
		const host = view.display[0];
		if (host.t !== 'commit' || !host.runBelow) throw new Error('expected a host row with a run');
		const groupId = host.runBelow.groupId;

		view.toggleGroup(groupId);
		flushSync();
		expect(view.display.map((d) => d.t)).toEqual(['commit', 'commit', 'commit']);
		const openHost = view.display[0];
		expect(openHost.t === 'commit' && openHost.runBelow?.collapsed).toBe(false);
		expect(view.expanded.has(groupId)).toBe(true);

		view.toggleGroup(groupId);
		flushSync();
		expect(view.display.map((d) => d.t)).toEqual(['commit']);

		view.expandGroup(groupId);
		view.expandGroup(groupId); // idempotent
		flushSync();
		expect(view.expanded.has(groupId)).toBe(true);
		root.cleanup();
	});
});

describe('useCommitHistoryView selection bridge', () => {
	it('toggles selection through the shared cache mutation', () => {
		const { view, root } = setup({
			branches: [branch('main', { current: true }), branch('feature/a')]
		});

		view.toggleBranchSelection('feature/a');
		expect(spies.mutate).toHaveBeenCalledWith({
			repoId: 'repo-1',
			branchNames: ['feature/a'],
			isSelected: true
		});
		root.cleanup();
	});

	it('deselects an already-selected branch', () => {
		const { view, root } = setup({
			branches: [branch('feature/a', { selected: true })]
		});

		expect(view.isSelected('feature/a')).toBe(true);
		view.toggleBranchSelection('feature/a');
		expect(spies.mutate).toHaveBeenCalledWith({
			repoId: 'repo-1',
			branchNames: ['feature/a'],
			isSelected: false
		});
		root.cleanup();
	});

	it('refuses the current branch, locked branches, and unknown names', () => {
		const { view, root } = setup({
			branches: [
				branch('main', { current: true }),
				branch('locked', { locked: true }),
				branch('feature/a', { selected: true })
			]
		});

		expect(view.isSelectable('main')).toBe(false);
		expect(view.isSelectable('locked')).toBe(false);
		expect(view.isSelectable('gone')).toBe(false);
		expect(view.isSelectable('feature/a')).toBe(true);
		expect(view.isSelected('gone')).toBe(false);
		expect(view.getBranch('feature/a')?.getName()).toBe('feature/a');
		expect(view.getBranch('gone')).toBeUndefined();
		expect(view.selectedCount).toBe(1);

		view.toggleBranchSelection('main');
		view.toggleBranchSelection('locked');
		view.toggleBranchSelection('gone');
		expect(spies.mutate).not.toHaveBeenCalled();
		root.cleanup();
	});
});

describe('useCommitHistoryView paging', () => {
	it('fetches the next page when scrolled near the end', () => {
		const { view, root } = setup({
			pages: [page(chain(20), 'cur:20', 100)],
			hasNextPage: true
		});

		view.loadMoreIfNeeded(5);
		expect(spies.fetchNextPage).not.toHaveBeenCalled();

		view.loadMoreIfNeeded(15); // within the threshold of 20 loaded
		expect(spies.fetchNextPage).toHaveBeenCalledTimes(1);
		root.cleanup();
	});

	it('does not fetch when already fetching or exhausted', () => {
		const { view, historyHolder, root } = setup({
			pages: [page(chain(20), 'cur:20', 100)],
			hasNextPage: true
		});

		historyHolder.value = { ...historyHolder.value, isFetchingNextPage: true };
		flushSync();
		view.loadMoreIfNeeded(19);
		expect(spies.fetchNextPage).not.toHaveBeenCalled();

		historyHolder.value = {
			...historyHolder.value,
			isFetchingNextPage: false,
			hasNextPage: false
		};
		flushSync();
		view.loadMoreIfNeeded(19);
		expect(spies.fetchNextPage).not.toHaveBeenCalled();
		root.cleanup();
	});

	it('flags a stale cursor and reloads from scratch', () => {
		const { view, historyHolder, root } = setup();

		historyHolder.value = {
			...historyHolder.value,
			isError: true,
			error: { message: 'stale', kind: 'history_cursor_stale', description: null }
		};
		flushSync();

		expect(view.isStale).toBe(true);
		expect(view.isError).toBe(false); // stale is not a generic error

		view.reload();
		expect(spies.resetQueries).toHaveBeenCalledWith({ queryKey: ['commit-history'] });
		expect(view.laneCount).toBe(0);
		root.cleanup();
	});

	it('surfaces other errors as errors', () => {
		const error: AppError = { message: 'nope', kind: 'repository_open_failed', description: null };
		const { view, historyHolder, root } = setup();
		historyHolder.value = { ...historyHolder.value, isError: true, error };
		flushSync();

		expect(view.isError).toBe(true);
		expect(view.error).toEqual(error);
		expect(view.isStale).toBe(false);
		root.cleanup();
	});
});

describe('useCommitHistoryView deep-link', () => {
	it('locates the target, pages until loaded, and stages the reveal', async () => {
		spies.fetchCommitLocation.mockResolvedValue({ targetIndex: 4, totalCount: 6 });

		const { view, historyHolder, targetHolder, root } = setup({
			pages: [page(chain(3), 'cur:3', 6)],
			hasNextPage: true
		});
		spies.fetchNextPage.mockImplementation(async () => {
			historyHolder.value = {
				...historyHolder.value,
				data: { pages: [...historyHolder.value.data!.pages, page(chain(3, 3), null, 6)] },
				dataUpdatedAt: historyHolder.value.dataUpdatedAt + 1,
				hasNextPage: false
			};
			flushSync();
		});

		targetHolder.value = 'c4';
		flushSync();

		await vi.waitFor(() => expect(view.pendingReveal).toEqual({ sha: 'c4', commitIndex: 4 }));
		expect(spies.fetchCommitLocation).toHaveBeenCalledWith(expect.anything(), {
			repoId: 'repo-1',
			path: '/repo',
			targetSha: 'c4'
		});
		expect(spies.fetchNextPage).toHaveBeenCalledTimes(1);

		view.completeReveal();
		expect(view.highlightSha).toBe('c4');
		expect(view.pendingReveal).toBeNull();

		view.clearHighlight();
		expect(view.highlightSha).toBeNull();
		root.cleanup();
	});

	it('does not re-reveal the same target twice', async () => {
		spies.fetchCommitLocation.mockResolvedValue({ targetIndex: 0, totalCount: 3 });
		const { view, targetHolder, root } = setup({ targetCommit: 'c0' });

		await vi.waitFor(() => expect(view.pendingReveal).not.toBeNull());
		expect(spies.fetchCommitLocation).toHaveBeenCalledTimes(1);

		// Re-assigning the same target does not re-trigger.
		targetHolder.value = 'c0';
		flushSync();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(spies.fetchCommitLocation).toHaveBeenCalledTimes(1);
		root.cleanup();
	});

	it('surfaces a commit_not_found error as a dismissible banner state', async () => {
		const error: AppError = {
			message: 'Commit **nope** not found',
			kind: 'commit_not_found',
			description: null
		};
		spies.fetchCommitLocation.mockRejectedValue(error);

		const { view, root } = setup({ targetCommit: 'nope123' });

		await vi.waitFor(() => expect(view.deepLinkError).toEqual(error));
		expect(view.pendingReveal).toBeNull();

		view.dismissDeepLinkError();
		expect(view.deepLinkError).toBeNull();
		root.cleanup();
	});

	it('refuses to auto-load beyond the depth cap', async () => {
		spies.fetchCommitLocation.mockResolvedValue({ targetIndex: 60_000, totalCount: 100_000 });

		const { view, root } = setup({ targetCommit: 'deadbee' });

		await vi.waitFor(() => expect(view.deepLinkError?.kind).toBe('commit_too_deep'));
		expect(spies.fetchNextPage).not.toHaveBeenCalled();
		expect(view.pendingReveal).toBeNull();
		root.cleanup();
	});
});

describe('useCommitHistoryView visibility reporting', () => {
	it('feeds visible branch names to the comparisons composable', async () => {
		const { view, root } = setup();

		view.visibleBranchNames = ['main'];
		flushSync();

		await vi.waitFor(() =>
			expect(spies.fetchBranchComparisonBatch).toHaveBeenCalledWith(expect.anything(), {
				repoId: 'repo-1',
				path: '/repo',
				branchNames: ['main']
			})
		);
		await vi.waitFor(() => expect(view.comparisons.baseName).toBe('main'));
		root.cleanup();
	});
});

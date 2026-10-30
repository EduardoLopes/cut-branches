import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import BranchList from '../branch-list.svelte';
import { branchesHolder, pathHolder, searchHolder } from './reactive-branches.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

const mocks = vi.hoisted(() => ({
	switchMutate: vi.fn(),
	switchState: { isPending: false, variables: null as { branch: string } | null },
	switchOnSuccess: undefined as undefined | ((data: { currentBranch: string }) => void),
	selectionMutate: vi.fn(),
	flags: new Set<string>(),
	metrics: {
		value: { isMerged: false, linesAdded: 3, linesRemoved: 1 } as
			{ isMerged: boolean; linesAdded: number; linesRemoved: number } | undefined
	},
	fetchWindow: vi.fn(() => Promise.resolve({})),
	metricsConfig: undefined as
		| undefined
		| { visibleRange: () => unknown; branchNames: () => readonly string[]; enabled: () => boolean }
}));

function branch(overrides: Partial<BranchData> = {}) {
	return Branch.fromData(mockDataFactory.branch(overrides));
}

function createMockBranches() {
	return [
		branch({ name: 'feature/test-branch' }),
		branch({ name: 'selected-branch', isSelected: true }),
		branch({ name: 'locked-branch', isLocked: true }),
		branch({ name: 'current-branch', current: true, fullyMerged: true })
	];
}

// `$state`-backed holders (see reactive-branches.svelte.ts): replacing their
// value re-runs the component's `$derived` chain like a refetch would.
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

vi.mock('$domains/branch-management/core/composables/search-branches.svelte', async () => {
	const { searchHolder: holder } = await import('./reactive-branches.svelte');
	return {
		getSearchBranchesStore: () => ({
			get state() {
				return holder.value;
			}
		})
	};
});

vi.mock('$app/state', async () => {
	const { pathHolder: holder } = await import('./reactive-branches.svelte');
	return {
		page: {
			url: {
				get pathname() {
					return holder.value;
				}
			}
		}
	};
});

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation',
	() => ({
		createSwitchBranchMutation: (options: {
			onSuccess: (data: { currentBranch: string }) => void;
		}) => {
			mocks.switchOnSuccess = options.onSuccess;
			return {
				mutate: mocks.switchMutate,
				get isPending() {
					return mocks.switchState.isPending;
				},
				get variables() {
					return mocks.switchState.variables;
				}
			};
		}
	})
);

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation',
	() => ({
		createUpdateBranchSelectionBatchMutation: () => ({
			mutate: mocks.selectionMutate,
			isPending: false
		})
	})
);

// The lock toggle runs its own query/mutation; it has its own tests.
vi.mock('$domains/branch-management/components/lock-branch-toggle.svelte', async () => ({
	default: (await import('./stub-component.svelte')).default
}));

// The graph preview runs its own history query; it has its own tests.
vi.mock(
	'$domains/branch-management/features/commit-history/components/commit-graph-preview.svelte',
	async () => ({ default: (await import('./stub-component.svelte')).default })
);

vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-get-commit-history-window-query',
	() => ({
		fetchCommitHistoryWindow: mocks.fetchWindow,
		PREVIEW_WINDOW: { contextBefore: 6, limit: 15 }
	})
);

vi.mock('$lib/feature-flags.svelte', () => ({
	isFeatureEnabled: (key: string) => mocks.flags.has(key)
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: vi.fn() }
}));

// The composable itself skips nothing: the list decides which rows ask.
vi.mock('$domains/branch-management/core/composables/use-branch-metrics.svelte', () => ({
	useBranchMetrics: (config: NonNullable<typeof mocks.metricsConfig>) => {
		mocks.metricsConfig = config;
		return {
			getMetrics: () => mocks.metrics.value
		};
	}
}));

type Screen = Awaited<ReturnType<typeof renderWithTestWrapper>>;

function render(props: Record<string, unknown> = {}) {
	return renderWithTestWrapper(BranchList, {
		repositoryID: 'repo1',
		repositoryPath: '/test/repo/path',
		...props
	});
}

function row(screen: Screen, name: string) {
	// Names in these tests are never substrings of one another's row text.
	return screen.getByRole('row').filter({ hasText: name });
}

/** The hover actions mount for the hovered row only. */
async function hoverRow(screen: Screen, name: string) {
	await row(screen, name).getByTestId('branch-name').hover();
	await tick();
}

describe('BranchList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		branchesHolder.value = createMockBranches();
		searchHolder.value = '';
		pathHolder.value = '/repos/repo1';
		mocks.flags.clear();
		mocks.switchState.isPending = false;
		mocks.switchState.variables = null;
		mocks.metrics.value = { isMerged: false, linesAdded: 3, linesRemoved: 1 };
	});

	describe('rows', () => {
		test('renders one grid row per branch, current branch first', async () => {
			const screen = await render();
			await tick();

			await expect.element(screen.getByRole('grid', { name: 'Branches' })).toBeInTheDocument();
			const names = screen.getByTestId('branch-name').elements();
			expect(names.map((el) => el.textContent?.trim())).toEqual([
				'current-branch',
				'feature/test-branch',
				'selected-branch',
				'locked-branch'
			]);
			await expect.element(screen.getByTestId('branch-current-badge')).toBeInTheDocument();
			await expect.element(screen.getByTestId('branch-locked-badge')).toBeInTheDocument();
		});

		test('virtualizes a long list: a window of rows mounted, the full count announced', async () => {
			branchesHolder.value = Array.from({ length: 300 }, (_, i) => branch({ name: `branch-${i}` }));
			const screen = await render();
			const scroller = screen.getByTestId('branch-list-scroller').element() as HTMLElement;
			scroller.style.flex = 'none';
			scroller.style.height = '400px';

			await vi.waitFor(() => {
				const mounted = screen.getByTestId('branch-row').elements().length;
				expect(mounted).toBeGreaterThan(0);
				expect(mounted).toBeLessThan(300);
			});
			// Header row + 300 branch rows.
			await expect
				.element(screen.getByRole('grid', { name: 'Branches' }))
				.toHaveAttribute('aria-rowcount', '301');
			// The unrendered rows' stand-in paints empty cards, not a blank well.
			const spacers = [...scroller.querySelectorAll<HTMLElement>('[data-grid-list-spacer]')];
			expect(spacers.some((el) => el.offsetHeight > 0)).toBe(true);
			for (const el of spacers) {
				expect(getComputedStyle(el).backgroundImage).toContain('repeating-linear-gradient');
			}
		});

		test('shows the last commit: subject, author, short sha and when', async () => {
			branchesHolder.value = [branch({ name: 'feature/x' })];
			const screen = await render();
			await tick();

			await expect
				.element(screen.getByTestId('branch-commit-subject'))
				.toHaveTextContent('Test commit');
			await expect.element(screen.getByTestId('branch-author')).toHaveTextContent('Test User');
			await expect.element(screen.getByTestId('branch-sha')).toHaveTextContent('abc1234');
			await expect.element(screen.getByTestId('branch-commit-date')).toMatchTextContent('ago');
		});

		test('marks whether a branch tracks a remote', async () => {
			branchesHolder.value = [
				branch({ name: 'tracked', upstream: 'origin/tracked' }),
				branch({ name: 'local-only' })
			];
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'tracked').getByTestId('branch-upstream'))
				.toBeInTheDocument();
			await expect
				.element(row(screen, 'local-only').getByTestId('branch-no-upstream'))
				.toBeInTheDocument();
		});
	});

	describe('alerts', () => {
		test('flags unmerged branches, but never the current one', async () => {
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('branch-alert-not-merged'))
				.toBeInTheDocument();
			expect(
				row(screen, 'current-branch').getByTestId('branch-alert-not-merged').elements()
			).toHaveLength(0);
		});

		test('flags offensive names, and protected names only once selected', async () => {
			branchesHolder.value = [
				branch({ name: 'master', fullyMerged: true }),
				branch({ name: 'release', fullyMerged: true, isSelected: true })
			];
			mocks.metrics.value = { isMerged: true, linesAdded: 0, linesRemoved: 0 };
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'master').getByTestId('offensive-words-alert'))
				.toBeInTheDocument();
			expect(row(screen, 'master').getByTestId('protected-words-alert').elements()).toHaveLength(0);
		});

		test('hides every alert when told to', async () => {
			const screen = await render({ showAlerts: false });
			await tick();

			expect(screen.getByTestId('branch-alert-not-merged').elements()).toHaveLength(0);
		});
	});

	describe('diff stats', () => {
		test('shows the lines a branch adds and removes, never for the current branch', async () => {
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('branch-diff-stats'))
				.toHaveTextContent('+3 −1');
			expect(
				row(screen, 'current-branch').getByTestId('branch-diff-stats').elements()
			).toHaveLength(0);
		});

		test('reads "±0" when a branch changes nothing', async () => {
			mocks.metrics.value = { isMerged: true, linesAdded: 0, linesRemoved: 0 };
			branchesHolder.value = [branch({ name: 'same' })];
			const screen = await render();
			await tick();

			await expect.element(screen.getByTestId('branch-diff-none')).toHaveTextContent('±0');
		});

		test('holds the slot with a placeholder until the stats arrive', async () => {
			mocks.metrics.value = undefined;
			branchesHolder.value = [
				branch({ name: 'pending' }),
				branch({ name: 'current-branch', current: true })
			];
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'pending').getByTestId('branch-diff-stats-loading'))
				.toBeInTheDocument();
			expect(
				row(screen, 'current-branch').getByTestId('branch-diff-stats-loading').elements()
			).toHaveLength(0);
		});

		test('shortens five-digit counts so the column keeps its width', async () => {
			mocks.metrics.value = { isMerged: false, linesAdded: 118229, linesRemoved: 9999 };
			branchesHolder.value = [branch({ name: 'huge' })];
			const screen = await render();
			await tick();

			await expect
				.element(screen.getByTestId('branch-diff-stats'))
				.toHaveTextContent('+118K −9999');
			await expect
				.element(screen.getByTestId('branch-diff-stats'))
				.toHaveAttribute('title', '118229 lines added, 9999 lines removed vs current branch');
		});

		test('asks for metrics only for the rows on screen', async () => {
			branchesHolder.value = Array.from({ length: 80 }, (_, i) => branch({ name: `b-${i}` }));
			const screen = await render();
			const scroller = screen.getByTestId('branch-list-scroller').element() as HTMLElement;
			scroller.style.flex = 'none';
			scroller.style.height = '200px';

			await vi.waitFor(() => {
				const range = mocks.metricsConfig?.visibleRange() as {
					startIndex: number;
					endIndex: number;
				} | null;
				expect(range?.startIndex).toBe(0);
				// A screen ahead is observed too, but nowhere near all 80 rows.
				expect(range?.endIndex).toBeGreaterThan(0);
				expect(range?.endIndex).toBeLessThan(79);
			});
			expect(mocks.metricsConfig?.branchNames()).toHaveLength(80);
			expect(mocks.metricsConfig?.enabled()).toBe(true);
		});
	});

	describe('selection', () => {
		test('checks the selected branches and disables the current and locked ones', async () => {
			const screen = await render();
			await tick();

			const checkbox = (name: string) => row(screen, name).getByRole('checkbox');
			await expect.element(checkbox('selected-branch')).toBeChecked();
			await expect.element(checkbox('feature/test-branch')).not.toBeChecked();
			await expect.element(checkbox('current-branch')).toBeDisabled();
			await expect.element(checkbox('locked-branch')).toBeDisabled();
		});

		test('writes a selection change back as a batch', async () => {
			const screen = await render();
			await tick();

			await row(screen, 'feature/test-branch').getByRole('checkbox').click();
			expect(mocks.selectionMutate).toHaveBeenCalledWith({
				repoId: 'repo1',
				branchNames: ['feature/test-branch'],
				isSelected: true
			});

			await row(screen, 'selected-branch').getByRole('checkbox').click();
			expect(mocks.selectionMutate).toHaveBeenCalledWith({
				repoId: 'repo1',
				branchNames: ['selected-branch'],
				isSelected: false
			});
		});

		test('renders no checkboxes when selection is off', async () => {
			const screen = await render({ allowSelection: false });
			await tick();

			expect(screen.getByRole('checkbox').elements()).toHaveLength(0);
		});

		test('ignores selection changes without a repository', async () => {
			const screen = await render({ repositoryID: undefined });
			await tick();

			await row(screen, 'feature/test-branch').getByRole('checkbox').click();
			expect(mocks.selectionMutate).not.toHaveBeenCalled();
		});
	});

	describe('row actions', () => {
		test('mounts the actions only for the hovered or focused row', async () => {
			const screen = await render();
			await tick();

			expect(screen.getByTestId('switch-button').elements()).toHaveLength(0);

			await hoverRow(screen, 'feature/test-branch');
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(1);
			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('switch-button'))
				.toBeInTheDocument();

			// The pointer moves on: the actions follow it.
			await hoverRow(screen, 'selected-branch');
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(1);
			await expect
				.element(row(screen, 'selected-branch').getByTestId('switch-button'))
				.toBeInTheDocument();

			// Leaving the list drops them; a focused row keeps its own.
			(row(screen, 'locked-branch').element() as HTMLElement).focus();
			await userEvent.unhover(screen.getByTestId('branch-list-scroller'));
			await tick();
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(1);
			await expect
				.element(row(screen, 'locked-branch').getByTestId('switch-button'))
				.toBeInTheDocument();

			// Focus moving to another row takes them along.
			(row(screen, 'selected-branch').element() as HTMLElement).focus();
			await tick();
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(1);
			await expect
				.element(row(screen, 'selected-branch').getByTestId('switch-button'))
				.toBeInTheDocument();

			// Focus leaving the list drops those too.
			(row(screen, 'selected-branch').element() as HTMLElement).blur();
			await tick();
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(0);
		});

		test("keeps the switching row's actions mounted", async () => {
			mocks.switchState.isPending = true;
			mocks.switchState.variables = { branch: 'feature/test-branch' };
			const screen = await render();
			await tick();

			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('switch-button'))
				.toBeInTheDocument();
		});

		test('switches to a branch and drops it from the selection once current', async () => {
			const screen = await render();
			await tick();

			await hoverRow(screen, 'feature/test-branch');
			await row(screen, 'feature/test-branch').getByTestId('switch-button').click({ force: true });
			expect(mocks.switchMutate).toHaveBeenCalledWith({
				path: '/test/repo/path',
				branch: 'feature/test-branch'
			});

			mocks.switchOnSuccess?.({ currentBranch: 'feature/test-branch' });
			expect(mocks.selectionMutate).toHaveBeenCalledWith({
				repoId: 'repo1',
				branchNames: ['feature/test-branch'],
				isSelected: false
			});
		});

		test('does nothing without a repository path, or a repository id on success', async () => {
			const screen = await render({ repositoryPath: undefined, repositoryID: undefined });
			await tick();

			await hoverRow(screen, 'feature/test-branch');
			await row(screen, 'feature/test-branch').getByTestId('switch-button').click({ force: true });
			expect(mocks.switchMutate).not.toHaveBeenCalled();
			mocks.switchOnSuccess?.({ currentBranch: 'feature/test-branch' });
			expect(mocks.selectionMutate).not.toHaveBeenCalled();
		});

		test('locks other switch buttons while one switch is in flight', async () => {
			mocks.switchState.isPending = true;
			mocks.switchState.variables = { branch: 'feature/test-branch' };
			const screen = await render();
			await tick();

			await hoverRow(screen, 'selected-branch');
			await expect
				.element(row(screen, 'selected-branch').getByTestId('switch-button'))
				.toBeDisabled();
			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('switch-button'))
				.not.toBeDisabled();
		});

		test('links to the diff and history views when their flags are on', async () => {
			mocks.flags.add('branch-diff');
			mocks.flags.add('commit-history');
			const screen = await render();
			await tick();

			await hoverRow(screen, 'feature/test-branch');
			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('branch-diff-link'))
				.toHaveAttribute('href', expect.stringContaining('diff?branch=feature%2Ftest-branch'));
			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('branch-history-link'))
				.toHaveAttribute('href', expect.stringContaining('history?commit=abc1234'));
			// The current branch has nothing to diff against itself.
			await hoverRow(screen, 'current-branch');
			expect(row(screen, 'current-branch').getByTestId('branch-diff-link').elements()).toHaveLength(
				0
			);
		});

		test('hides switching and locking when the view disallows them', async () => {
			const screen = await render({ allowSetCurrent: false, allowLocking: false });
			await tick();

			await hoverRow(screen, 'feature/test-branch');
			expect(screen.getByTestId('switch-button').elements()).toHaveLength(0);
			expect(screen.getByTestId('stub-component').elements()).toHaveLength(0);
		});
	});

	describe('restore view', () => {
		test('shows when each branch was deleted, with no upstream, links or metrics', async () => {
			pathHolder.value = '/repos/repo1/restore';
			mocks.flags.add('branch-diff');
			mocks.flags.add('commit-history');
			branchesHolder.value = [branch({ name: 'gone', deletedAt: '2024-01-01T00:00:00Z' })];
			const screen = await render({ allowSetCurrent: false, allowLocking: false });
			await tick();
			// Focus mounts the row's actions as hover does: there are none here.
			(row(screen, 'gone').element() as HTMLElement).focus();
			await tick();

			await expect
				.element(screen.getByTestId('deleted-at-title-gone'))
				.toMatchTextContent('Deleted');
			expect(screen.getByTestId('branch-no-upstream').elements()).toHaveLength(0);
			expect(screen.getByTestId('branch-diff-link').elements()).toHaveLength(0);
			expect(screen.getByTestId('branch-history-link').elements()).toHaveLength(0);
			expect(mocks.metricsConfig?.enabled()).toBe(false);
		});
	});

	describe('search', () => {
		test('filters the rows and scrolls back to the top of the result', async () => {
			branchesHolder.value = Array.from({ length: 40 }, (_, i) => branch({ name: `b-${i}` }));
			const screen = await render();
			const scroller = screen.getByTestId('branch-list-scroller').element() as HTMLElement;
			scroller.style.flex = 'none';
			scroller.style.height = '200px';
			await tick();
			// `scroll` mode: the root is a frame, the grid inside it scrolls.
			const port = screen.getByRole('grid', { name: 'Branches' }).element() as HTMLElement;
			port.scrollTop = 400;
			expect(port.scrollTop).toBeGreaterThan(0);

			searchHolder.value = 'b-1';
			await tick();

			// b-1 and b-10…b-19.
			expect(screen.getByTestId('branch-row').elements()).toHaveLength(11);
			await vi.waitFor(() => expect(port.scrollTop).toBe(0));
		});
	});

	describe('commit graph preview', () => {
		function hover(screen: Screen, name: string, event: 'mouseenter' | 'mouseleave') {
			row(screen, name)
				.getByTestId('branch-commit-subject')
				.element()
				.dispatchEvent(new MouseEvent(event));
		}

		// Real timers: faking setTimeout would also freeze expect.element's polling.
		const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		test('opens on a resting hover, prefetching the window, and closes on leave', async () => {
			mocks.flags.add('commit-history');
			const screen = await render();
			await tick();
			const preview = () => screen.getByTestId('branch-commit-preview');

			hover(screen, 'feature/test-branch', 'mouseenter');
			expect(mocks.fetchWindow).toHaveBeenCalledWith(expect.anything(), {
				repoId: 'repo1',
				path: '/test/repo/path',
				targetSha: 'abc1234567890def1234567890abcdef12345678',
				contextBefore: 6,
				limit: 15
			});
			// Sweeping across rows doesn't flash previews: nothing until it rests.
			expect(preview().elements()).toHaveLength(0);

			await expect.element(preview()).toBeVisible();

			// Moving from the subject into the preview keeps it open.
			hover(screen, 'feature/test-branch', 'mouseleave');
			preview().element().dispatchEvent(new MouseEvent('mouseenter'));
			await wait(300);
			await expect.element(preview()).toBeVisible();

			preview().element().dispatchEvent(new MouseEvent('mouseleave'));
			await expect.element(preview()).not.toBeVisible();
		});

		test('stays off without the history flag, and the subject keeps its full message as a title', async () => {
			const screen = await render();
			await tick();

			hover(screen, 'feature/test-branch', 'mouseenter');
			expect(mocks.fetchWindow).not.toHaveBeenCalled();
			await expect
				.element(row(screen, 'feature/test-branch').getByTestId('branch-commit-subject'))
				.toHaveAttribute('title', 'Test commit');
		});
	});
});

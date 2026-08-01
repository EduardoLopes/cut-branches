import { tick } from 'svelte';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import BranchList from '../branch-list.svelte';
import { branchesHolder } from './reactive-branches.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { UpdateCurrentBranchInput } from '$infrastructure/bindings';
import { mockDataFactory, renderWithTestWrapper } from '$utils/test-utils';

// Generate mock branches using factory and convert to domain models
function createMockBranches() {
	return [
		Branch.fromData(mockDataFactory.branch({ name: 'feature/test-branch', current: false })),
		Branch.fromData(
			mockDataFactory.branch({ name: 'selected-branch', current: false, isSelected: true })
		),
		Branch.fromData(
			mockDataFactory.branch({ name: 'locked-branch', current: false, isLocked: true })
		),
		Branch.fromData(mockDataFactory.branch({ name: 'current-branch', current: true }))
	];
}

function createManyMockBranches(count = 15) {
	return Array.from({ length: count }, (_, i) =>
		Branch.fromData(
			mockDataFactory.branch({
				name: `branch-${i + 1}`,
				current: false
			})
		)
	);
}

// Mock the query to return branches data. The holder is `$state`-backed (see
// reactive-branches.svelte.ts) so replacing its value re-runs the component's
// `$derived` chain, letting tests rewrite the list mid-flight like a refetch.
vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', async () => {
	const { branchesHolder: holder } = await import('./reactive-branches.svelte');
	return {
		createGetBranchesQuery: () => {
			// Return an object with a getter that always returns current branches
			const mockQuery = {
				get data() {
					return { branches: holder.value };
				},
				isLoading: false,
				isError: false,
				error: null
			};
			return mockQuery;
		}
	};
});

vi.mock('$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation', () => {
	const mutate = vi.fn();
	return {
		createSwitchBranchMutation: () => {
			return {
				mutate,
				isPending: false,
				variables: null
			};
		}
	};
});

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation',
	() => ({
		createUpdateBranchSelectionBatchMutation: () => ({
			mutate: vi.fn(),
			isPending: false
		})
	})
);

vi.mock('../../store/search-branches.svelte', () => ({
	getSearchBranchesStore: () => ({
		state: ''
	})
}));

vi.mock('$app/state', () => ({
	page: {
		url: {
			pathname: '/repos/repo1'
		}
	}
}));

// Mock Tauri commands via bindings
vi.mock('$infrastructure/bindings', async () => {
	const actual = await vi.importActual<typeof import('$infrastructure/bindings')>(
		'$infrastructure/bindings'
	);
	const { branchesHolder: holder } = await import('./reactive-branches.svelte');
	return {
		...actual,
		commands: {
			getBranchList: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: { branches: holder.value }
				})
			),
			updateCurrentBranch: vi.fn((input: UpdateCurrentBranchInput) =>
				Promise.resolve({
					status: 'ok' as const,
					data: { currentBranch: input.branch }
				})
			),
			updateBranchSelectionBatch: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: {}
				})
			),
			getBranchMergeStatus: vi.fn(() =>
				Promise.resolve({
					status: 'ok' as const,
					data: { isMerged: false }
				})
			)
		}
	};
});

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock(
	'$domains/branch-management/infrastructure/queries/create-branch-merge-status-query',
	() => ({
		createBranchMergeStatusQuery: () => ({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null
		})
	})
);

vi.mock('$domains/branch-management/infrastructure/queries/create-branch-diff-stats-query', () => ({
	// Mirrors the real adapter's gating: a disabled query never has data, so
	// current/deleted branches render without diff badges in these tests.
	createBranchDiffStatsQuery: (_input: unknown, options?: { enabled?: boolean }) => ({
		data: options?.enabled === false ? undefined : { linesAdded: 3, linesRemoved: 1 },
		isLoading: false,
		isError: false,
		error: null
	})
}));

describe('BranchList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		branchesHolder.value = createMockBranches();
	});

	test('renders branches list with checkboxes and switch buttons', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Check that we have list items
		const list = screen.getByRole('list');
		expect(list).toBeInTheDocument();
		const listItems = screen.container.querySelectorAll('[role="listitem"]');
		expect(listItems.length).toBe(4); // We have 4 branches

		// Check for checkboxes (2 non-current branches should have checkboxes)
		const checkboxes = screen.container.querySelectorAll('input[type="checkbox"]');
		expect(checkboxes.length).toBe(2); // 2 non-current branches

		// Check for switch buttons (non-current branches should have switch buttons)
		const switchButtons = screen.container.querySelectorAll('[data-testid="switch-button"]');
		expect(switchButtons.length).toBe(3); // 3 non-current branches
	});

	test('passes diff stats to branch cards for non-current branches only', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		await tick();

		// The mocked diff-stats query returns +3/−1 for enabled branches and
		// undefined for disabled ones. Asserted per card rather than by count:
		// the query is also gated on the row being settled inside the viewport,
		// so how many rows carry badges depends on the virtual window.
		const otherCard = screen.container.querySelector('[id="branch-feature/test-branch-container"]');
		expect(otherCard?.querySelector('[data-testid="branch-diff-stats"]')).toBeInTheDocument();

		const currentCard = screen.container.querySelector('#branch-current-branch-container');
		expect(currentCard?.querySelector('[data-testid="branch-diff-stats"]')).toBeNull();
	});

	test('virtualizes long lists instead of paginating them', async () => {
		// Set many branches
		branchesHolder.value = createManyMockBranches();

		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// The pagination control is gone — the list is one continuous scroller.
		expect(screen.container.textContent).not.toContain('Next');
		const scroller = screen.container.querySelector('[data-testid="branch-list-scroller"]');
		expect(scroller).toBeInTheDocument();

		// Rows are windowed, so each one advertises its place in the full set —
		// assistive tech still reports 15 branches, not just the rendered slice.
		const listItems = screen.container.querySelectorAll('[role="listitem"]');
		expect(listItems.length).toBeGreaterThan(0);
		expect(listItems[0]?.getAttribute('aria-setsize')).toBe('15');
		expect(listItems[0]?.getAttribute('aria-posinset')).toBe('1');

		// The sizer reserves room for every row, so the scrollbar reflects the
		// whole list rather than the rendered window.
		const sizer = screen.container.querySelector('[role="list"]') as HTMLElement;
		expect(Number.parseFloat(sizer.style.height)).toBeGreaterThan(15 * 100);
	});

	test('keeps rows it has already scrolled past mounted', async () => {
		branchesHolder.value = createManyMockBranches();

		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		await tick();

		const scroller = screen.container.querySelector(
			'[data-testid="branch-list-scroller"]'
		) as HTMLElement;
		// Constrain the port so the list actually overflows and can be scrolled.
		scroller.style.flex = 'none';
		scroller.style.height = '200px';
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

		const first = screen.container.querySelectorAll('[role="listitem"]').length;
		expect(first).toBeGreaterThan(0);

		// Scroll to the end. A sliding window would have unmounted the top rows;
		// a growing one keeps them, so the row count only ever goes up.
		scroller.scrollTop = scroller.scrollHeight;
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		await tick();

		const afterScroll = screen.container.querySelectorAll('[role="listitem"]').length;
		expect(afterScroll).toBeGreaterThanOrEqual(first);
		// Row 1 was rendered at the top and is still here at the bottom.
		expect(
			screen.container.querySelector('[role="listitem"][aria-posinset="1"]')
		).toBeInTheDocument();
	});

	test('drops the retained window when the branch list changes', async () => {
		branchesHolder.value = createManyMockBranches(40);

		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		await tick();

		const scroller = screen.container.querySelector(
			'[data-testid="branch-list-scroller"]'
		) as HTMLElement;
		scroller.style.flex = 'none';
		scroller.style.height = '200px';
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

		// Scroll to the bottom so the top rows are only alive via retention.
		scroller.scrollTop = scroller.scrollHeight;
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		await tick();

		expect(
			screen.container.querySelector('[role="listitem"][aria-posinset="1"]')
		).toBeInTheDocument();
		const retainedCount = screen.container.querySelectorAll('[role="listitem"]').length;

		// Simulate a refetch that rewrites the list (new names => new keys).
		branchesHolder.value = Array.from({ length: 40 }, (_, i) =>
			Branch.fromData(mockDataFactory.branch({ name: `renamed-${i + 1}`, current: false }))
		);
		await tick();
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		await tick();

		// The retained window was dropped: row 1 (far above the viewport) is gone
		// and only the band around the current offset is mounted.
		expect(screen.container.querySelector('[role="listitem"][aria-posinset="1"]')).toBeNull();
		expect(screen.container.querySelectorAll('[role="listitem"]').length).toBeLessThan(
			retainedCount
		);
		// And a background data change must NOT yank the user back to the top.
		expect(scroller.scrollTop).toBeGreaterThan(0);
	});

	test('scroll port is focusable and named for keyboard and AT users', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		await tick();

		const scroller = screen.container.querySelector(
			'[data-testid="branch-list-scroller"]'
		) as HTMLElement;
		expect(scroller).toHaveAttribute('tabindex', '0');
		expect(scroller).toHaveAttribute('role', 'region');
		expect(scroller).toHaveAttribute('aria-label', 'Branch list');

		// Once focusable, Chromium scrolls the port natively with the keyboard —
		// focus landing here is the whole keyboard-access story.
		scroller.focus();
		expect(document.activeElement).toBe(scroller);
	});

	test('toggle checkbox should update selected branches state', async () => {
		const screen = renderWithTestWrapper(BranchList, {
			repositoryID: 'repo1',
			repositoryPath: '/test/repo/path'
		});

		// Wait for component to render
		await tick();

		// Find checkbox for the first non-current, non-selected, non-locked branch
		// That would be 'feature/test-branch' with the id 'checkbox-feature/test-branch'
		const checkbox = screen.container.querySelector(
			'#checkbox-feature\\/test-branch'
		) as HTMLInputElement;
		expect(checkbox).toBeInTheDocument();
		expect(checkbox.checked).toBe(false);

		// Click the checkbox
		checkbox.click();

		// Wait for async mutation to complete
		await tick();

		// The component now uses mutations instead of direct store manipulation
		// The mutation will be called via Tauri command, which is mocked
		// We just verify the checkbox interaction worked without errors
		expect(checkbox.checked).toBe(true);
	});
});

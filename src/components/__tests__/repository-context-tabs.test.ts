import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RepositoryContextTabs from '../repository-context-tabs.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	enabled: true,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	repoData: { path: '/repos/main', isWorktree: false } as any,
	linkedCount: 3,
	pathname: '/repos/r1',
	goto: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => h.goto(...args) }));
vi.mock('$app/state', () => ({
	get page() {
		return { url: { pathname: h.pathname }, params: { id: 'r1' } };
	}
}));
vi.mock('$lib/feature-flags.svelte', () => ({ isFeatureEnabled: () => h.enabled }));
vi.mock('$infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		get data() {
			return h.repoData;
		}
	})
}));
vi.mock('$domains/worktree-management/core/composables/use-worktrees-view.svelte', () => ({
	useWorktreesView: () => ({
		get linkedCount() {
			return h.linkedCount;
		}
	})
}));

beforeEach(() => {
	h.enabled = true;
	h.repoData = { path: '/repos/main', isWorktree: false };
	h.linkedCount = 3;
	h.pathname = '/repos/r1';
	h.goto.mockReset();
});

describe('RepositoryContextTabs', () => {
	it('renders both contexts with the worktree count when enabled', async () => {
		const screen = renderWithTestWrapper(RepositoryContextTabs, { id: 'r1' });
		await tick();
		await expect.element(screen.getByTestId('repository-context-switch')).toBeInTheDocument();
		await expect.element(screen.getByTestId('context-worktrees-count')).toHaveTextContent('3');
	});

	it('hides the tabs when the feature flag is off', async () => {
		h.enabled = false;
		const screen = renderWithTestWrapper(RepositoryContextTabs, { id: 'r1' });
		await tick();
		expect(screen.container.querySelector('[data-testid="repository-context-switch"]')).toBeNull();
	});

	it('hides the tabs when the repository is itself a linked worktree', async () => {
		h.repoData = { path: '/repos/wt', isWorktree: true };
		const screen = renderWithTestWrapper(RepositoryContextTabs, { id: 'r1' });
		await tick();
		expect(screen.container.querySelector('[data-testid="repository-context-switch"]')).toBeNull();
	});

	it('navigates to the worktrees route when selecting Worktrees', async () => {
		const screen = renderWithTestWrapper(RepositoryContextTabs, { id: 'r1' });
		await tick();
		await screen.getByTestId('context-worktrees').click();
		expect(h.goto).toHaveBeenCalledWith('/repos/r1/worktrees');
	});
});

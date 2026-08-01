import { beforeEach, describe, expect, it, vi } from 'vitest';
import BranchRecentCommits from '../branch-recent-commits.svelte';
import type { HistoryCommit } from '$domains/branch-management/features/commit-history/models/commit-graph';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query: {} as any,
	diffEnabled: true
}));

vi.mock(
	'$domains/branch-management/features/commit-history/infrastructure/queries/create-list-branch-commits-query',
	() => ({
		createListBranchCommitsQuery: vi.fn(() => h.query),
		BRANCH_COMMITS_PAGE_SIZE: 10
	})
);
vi.mock('$lib/feature-flags.svelte', () => ({ isFeatureEnabled: () => h.diffEnabled }));

const mk = (sha: string, message: string): HistoryCommit => ({
	sha,
	shortSha: sha.slice(0, 7),
	parents: [],
	refs: [],
	author: 'Ada Lovelace',
	email: 'ada@example.com',
	date: '2024-01-15T10:30:00Z',
	message
});

const setQuery = (state: Record<string, unknown>) => {
	h.query = { isPending: false, isError: false, error: null, data: undefined, ...state };
};

const props = { repoId: '1', path: '/repos/one', branch: 'feature/a' };

describe('BranchRecentCommits', () => {
	beforeEach(() => {
		h.diffEnabled = true;
		setQuery({});
	});

	it('shows a loading line while the commits are in flight', async () => {
		setQuery({ isPending: true });

		const { getByTestId } = renderWithTestWrapper(BranchRecentCommits, props);

		await expect.element(getByTestId('recent-commits-loading')).toBeInTheDocument();
	});

	it('surfaces the error message when the walk fails', async () => {
		setQuery({ isError: true, error: { message: 'branch not found' } });

		const { getByTestId } = renderWithTestWrapper(BranchRecentCommits, props);

		await expect.element(getByTestId('recent-commits-error')).toHaveTextContent('branch not found');
	});

	it('reports an empty branch rather than rendering nothing', async () => {
		setQuery({ data: { commits: [], hasMore: false } });

		const { getByTestId } = renderWithTestWrapper(BranchRecentCommits, props);

		await expect.element(getByTestId('recent-commits-empty')).toBeInTheDocument();
	});

	it('says so when the tip is the only commit, rather than repeating it', async () => {
		setQuery({ data: { commits: [mk('abc1234567', 'feat: one')], hasMore: false } });

		const { getByTestId, container } = renderWithTestWrapper(BranchRecentCommits, props);

		await expect.element(getByTestId('recent-commits-empty')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="commit-sha"]').length).toBe(0);
	});

	it('skips the tip commit — the branch card already shows it above', async () => {
		setQuery({
			data: {
				commits: [
					mk('abc1234567', 'feat: tip'),
					mk('def4567890', 'fix: two\n\nbody text'),
					mk('0123456789', 'chore: three')
				],
				hasMore: false
			}
		});

		const { getByText, getByTestId, container } = renderWithTestWrapper(BranchRecentCommits, props);

		await expect.element(getByText('fix: two')).toBeInTheDocument();
		await expect.element(getByText('chore: three')).toBeInTheDocument();
		expect(container).not.toHaveTextContent('feat: tip');

		// Compact density: the SHA badge and the body disclosure are present —
		// this panel is where the mini row's dropped detail lives.
		expect(container.querySelectorAll('[data-testid="commit-sha"]').length).toBe(2);
		expect(container.querySelectorAll('[data-testid="toggle-commit-description"]').length).toBe(1);

		const diffLinks = container.querySelectorAll('[data-testid="commit-diff-link"]');
		expect(diffLinks.length).toBe(2);
		expect(diffLinks[0].getAttribute('href')).toContain('commit=def4567890');

		// No "showing N before the tip" footer when the branch fits in one window.
		expect(getByTestId('recent-commits-open-history')).not.toBeInTheDocument();
	});

	it('omits diff links when the diff feature is off', async () => {
		h.diffEnabled = false;
		setQuery({
			data: {
				commits: [mk('abc1234567', 'feat: tip'), mk('def4567890', 'fix: two')],
				hasMore: false
			}
		});

		const { container } = renderWithTestWrapper(BranchRecentCommits, props);

		expect(container.querySelectorAll('[data-testid="commit-diff-link"]').length).toBe(0);
	});

	it('links to the full history, aimed at the branch tip, when more commits exist', async () => {
		setQuery({
			data: {
				commits: [mk('abc1234567', 'feat: tip'), mk('def4567890', 'fix: two')],
				hasMore: true
			}
		});

		const { getByTestId } = renderWithTestWrapper(BranchRecentCommits, props);

		const link = getByTestId('recent-commits-open-history');
		await expect.element(link).toBeInTheDocument();
		expect(link.element().getAttribute('href')).toContain('commit=abc1234567');
	});
});

import { describe, expect, it, vi } from 'vitest';
import CommitRow from '../commit-row.svelte';
import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
import {
	computeGraph,
	type HistoryCommit,
	type RefDecoration
} from '$domains/branch-management/features/commit-history/models/commit-graph';
import { renderWithTestWrapper } from '$utils/test-utils';

const mk = (sha: string, parents: string[], refs: RefDecoration[] = []): HistoryCommit => ({
	sha,
	shortSha: sha.slice(0, 7),
	parents,
	refs,
	author: 'Ada Lovelace',
	email: 'ada@example.com',
	date: 'Mon Jan  1 00:00:00 2024 +0000',
	message: `message of ${sha}`
});

const graph = computeGraph([
	mk(
		'abc1234567',
		['def4567'],
		[
			{ name: 'main', kind: 'localBranch' },
			{ name: 'origin/main', kind: 'remoteBranch' },
			{ name: 'v1.0', kind: 'tag' }
		]
	),
	mk('def4567', [])
]);

const defaultProps = {
	laneCount: graph.laneCount,
	signals: (() => undefined) as (name: string) => BranchSignals | undefined,
	getBranch: () => undefined,
	isSelected: () => false,
	isSelectable: () => true,
	onToggle: () => {}
};

describe('CommitRow', () => {
	it('shows the short sha, message, and author', async () => {
		const { getByText } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[0],
			...defaultProps
		});

		await expect.element(getByText('abc1234', { exact: true })).toBeInTheDocument();
		await expect.element(getByText('message of abc1234567')).toBeInTheDocument();
		await expect.element(getByText('Ada Lovelace')).toBeInTheDocument();
	});

	it('renders non-local refs as badges but keeps local branches in the gutter', async () => {
		const { getByText, getByRole, container } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[0],
			...defaultProps
		});

		await expect.element(getByText('v1.0')).toBeInTheDocument();
		// The upstream ref is passed to the card but hidden by default — showing
		// the upstream is the branch card's job, not the history row's.
		expect(container.querySelector('[data-testid="commit-upstream"]')).toBeNull();
		// `main` appears as the gutter checkbox, not as a ref badge.
		await expect.element(getByRole('checkbox', { name: 'main' })).toBeInTheDocument();
		const badgeTexts = [...container.querySelectorAll('code ~ span')].map((n) => n.textContent);
		expect(badgeTexts.some((t) => t?.trim() === 'main')).toBe(false);
	});

	it('renders an empty gutter for a non-head commit', () => {
		const { container } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[1],
			...defaultProps
		});
		expect(container.querySelector('input')).toBeNull();
	});

	it('renders no run toggle when the row hosts no run', () => {
		const { container } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[0],
			...defaultProps
		});
		// The rail's center-node button remains; only the run toggle is absent.
		expect(container.querySelector('button[aria-label$="commits"]')).toBeNull();
	});

	it('offers to show a collapsed run below, with its count', async () => {
		const onToggleRun = vi.fn();
		const { getByRole, getByText } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[0],
			...defaultProps,
			runBelow: { groupId: 'def4567', count: 7, collapsed: true },
			onToggleRun
		});

		const button = getByRole('button', { name: 'Show 7 commits' });
		await expect.element(button).toBeInTheDocument();
		await expect.element(button).toHaveAttribute('aria-expanded', 'false');
		await expect.element(getByText('7', { exact: true })).toBeInTheDocument();

		await button.click();
		expect(onToggleRun).toHaveBeenCalledWith('def4567');
	});

	it('offers to hide an expanded run below', async () => {
		const onToggleRun = vi.fn();
		const { getByRole } = renderWithTestWrapper(CommitRow, {
			row: graph.rows[0],
			...defaultProps,
			runBelow: { groupId: 'def4567', count: 7, collapsed: false },
			onToggleRun
		});

		const button = getByRole('button', { name: 'Hide 7 commits' });
		await expect.element(button).toBeInTheDocument();
		await expect.element(button).toHaveAttribute('aria-expanded', 'true');

		await button.click();
		expect(onToggleRun).toHaveBeenCalledWith('def4567');
	});
});

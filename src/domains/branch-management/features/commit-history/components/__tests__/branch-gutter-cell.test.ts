import { describe, expect, it, vi } from 'vitest';
import BranchGutterCell from '../branch-gutter-cell.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
import {
	computeGraph,
	type GraphRow,
	type HistoryCommit,
	type RefDecoration
} from '$domains/branch-management/features/commit-history/models/commit-graph';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const mk = (sha: string, parents: string[], refs: RefDecoration[] = []): HistoryCommit => ({
	sha,
	shortSha: sha.slice(0, 7),
	parents,
	refs,
	author: 'Test User',
	email: 'test@example.com',
	date: 'Mon Jan  1 00:00:00 2024 +0000',
	message: `commit ${sha}`
});

const headRow = (refs: RefDecoration[]): GraphRow =>
	computeGraph([mk('head', ['root'], refs), mk('root', [])]).rows[0];

const singleHead = headRow([{ name: 'feature/a', kind: 'localBranch' }]);
const multiHead = headRow([
	{ name: 'feature/a', kind: 'localBranch' },
	{ name: 'feature/b', kind: 'localBranch' },
	{ name: 'feature/c', kind: 'localBranch' }
]);

const mkBranch = (name: string, overrides: Partial<BranchData> = {}): Branch =>
	Branch.fromData({
		name,
		fullyMerged: false,
		upstream: null,
		lastCommit: {
			sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
			shortSha: 'a1b2c3d',
			date: '2024-01-15T10:30:00.000Z',
			message: `commit on ${name}`,
			summary: `commit on ${name}`,
			author: 'Test User',
			email: 'test@example.com'
		},
		current: false,
		deletedAt: null,
		isReachable: true,
		isSelected: false,
		isLocked: false,
		...overrides
	});

const branches = new Map<string, Branch>([
	['feature/a', mkBranch('feature/a')],
	['feature/b', mkBranch('feature/b')],
	['feature/c', mkBranch('feature/c')]
]);

const defaultProps = {
	getBranch: (name: string) => branches.get(name),
	signals: (() => undefined) as (name: string) => BranchSignals | undefined,
	isSelected: () => false,
	isSelectable: () => true,
	onToggle: () => {}
};

describe('BranchGutterCell', () => {
	it('shows the first local branch with a selection checkbox', async () => {
		const { getByRole } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps
		});

		const checkbox = getByRole('checkbox', { name: 'feature/a' });
		await expect.element(checkbox).not.toBeChecked();
		await expect.element(checkbox).not.toBeDisabled();
	});

	it('renders the branch identity through the shared compact BranchCard', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps
		});

		await expect.element(getByTestId('branch-card')).toBeInTheDocument();
		await expect.element(getByTestId('branch-name')).toHaveTextContent('feature/a');
		// The card keeps its upstream footer — local-only branches state it
		// explicitly with the neutral "no upstream" badge.
		await expect.element(getByTestId('branch-no-upstream')).toBeInTheDocument();
	});

	it('shows the tracked upstream ref in the card footer', async () => {
		const trackedBranches = new Map<string, Branch>([
			['feature/a', mkBranch('feature/a', { upstream: 'origin/feature/a' })]
		]);
		const { getByTestId } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			getBranch: (name: string) => trackedBranches.get(name)
		});

		await expect.element(getByTestId('branch-upstream')).toHaveTextContent('origin/feature/a');
	});

	it('marks the card of a selected branch and disables locked ones', async () => {
		const lockedBranches = new Map<string, Branch>([
			['feature/a', mkBranch('feature/a', { isLocked: true })]
		]);
		const { container } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			getBranch: (name: string) => lockedBranches.get(name),
			isSelected: (name: string) => name === 'feature/a',
			isSelectable: () => false
		});

		const card = container.querySelector('[data-testid="branch-card"]');
		expect(card?.classList.contains('selected')).toBe(true);
		expect(card?.classList.contains('locked')).toBe(true);
	});

	it('surfaces the current badge and hides the checkbox for the current branch', async () => {
		const currentBranches = new Map<string, Branch>([
			['feature/a', mkBranch('feature/a', { current: true })]
		]);
		const { getByTestId, container } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			getBranch: (name: string) => currentBranches.get(name),
			isSelectable: () => false
		});

		await expect.element(getByTestId('branch-current-badge')).toBeInTheDocument();
		// The current branch can never be deleted — no checkbox at all; its
		// card fills the whole row instead.
		expect(container.querySelector('input')).toBeNull();
	});

	it('falls back to a plain branch name while the branches cache is unresolved', async () => {
		const { container, getByText } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			getBranch: () => undefined,
			signals: () => ({ sha: 's', ahead: 1, behind: 0 })
		});

		expect(container.querySelector('[data-testid="branch-card"]')).toBeNull();
		await expect.element(getByText('feature/a')).toBeInTheDocument();
		// Signals still render alongside the fallback identity.
		await expect.element(getByText('1↑')).toBeInTheDocument();
	});

	it('reflects and toggles the shared selection', async () => {
		const onToggle = vi.fn();
		const { getByRole } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			isSelected: (name: string) => name === 'feature/a',
			onToggle
		});

		const checkbox = getByRole('checkbox', { name: 'feature/a' });
		await expect.element(checkbox).toBeChecked();

		await checkbox.click();
		expect(onToggle).toHaveBeenCalledWith('feature/a');
	});

	it('disables the checkbox for non-selectable branches', async () => {
		const { getByRole } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			isSelectable: () => false
		});

		await expect.element(getByRole('checkbox', { name: 'feature/a' })).toBeDisabled();
	});

	it('renders ahead/behind signals as badges', async () => {
		const { getByText } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			signals: () => ({ sha: 's', ahead: 3, behind: 2 })
		});

		await expect.element(getByText('3↑')).toBeInTheDocument();
		await expect.element(getByText('2↓')).toBeInTheDocument();
	});

	it('marks a fully-contained branch as merged', async () => {
		const { getByText, container } = await renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			signals: () => ({ sha: 's', ahead: 0, behind: 0 })
		});

		await expect.element(getByText('merged')).toBeInTheDocument();
		expect(container.textContent).not.toContain('0↓');
	});

	it('lists every co-located branch behind a "+N more" popover', async () => {
		const { getByRole } = await renderWithTestWrapper(BranchGutterCell, {
			row: multiHead,
			...defaultProps
		});

		const more = getByRole('button', { name: '+2 more' });
		await expect.element(more).toBeInTheDocument();
		await more.click();

		await expect.element(getByRole('checkbox', { name: 'feature/b' })).toBeInTheDocument();
		await expect.element(getByRole('checkbox', { name: 'feature/c' })).toBeInTheDocument();
	});

	it('renders nothing for a non-head row', async () => {
		const nonHead = computeGraph([mk('a', ['b']), mk('b', [])]).rows[0];
		const { container } = await renderWithTestWrapper(BranchGutterCell, {
			row: nonHead,
			...defaultProps
		});
		expect(container.querySelector('input')).toBeNull();
	});
});

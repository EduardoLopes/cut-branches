import { describe, expect, it, vi } from 'vitest';
import BranchGutterCell from '../branch-gutter-cell.svelte';
import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
import {
	computeGraph,
	type GraphRow,
	type HistoryCommit,
	type RefDecoration
} from '$domains/branch-management/features/commit-history/models/commit-graph';
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

const defaultProps = {
	signals: (() => undefined) as (name: string) => BranchSignals | undefined,
	isSelected: () => false,
	isSelectable: () => true,
	onToggle: () => {}
};

describe('BranchGutterCell', () => {
	it('shows the first local branch with a selection checkbox', async () => {
		const { getByRole } = renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps
		});

		const checkbox = getByRole('checkbox', { name: 'feature/a' });
		await expect.element(checkbox).not.toBeChecked();
		await expect.element(checkbox).not.toBeDisabled();
	});

	it('reflects and toggles the shared selection', async () => {
		const onToggle = vi.fn();
		const { getByRole } = renderWithTestWrapper(BranchGutterCell, {
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
		const { getByRole } = renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			isSelectable: () => false
		});

		await expect.element(getByRole('checkbox', { name: 'feature/a' })).toBeDisabled();
	});

	it('renders ahead/behind signals as badges', async () => {
		const { getByText } = renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			signals: () => ({ sha: 's', ahead: 3, behind: 2 })
		});

		await expect.element(getByText('3↑')).toBeInTheDocument();
		await expect.element(getByText('2↓')).toBeInTheDocument();
	});

	it('marks a fully-contained branch as merged', async () => {
		const { getByText, container } = renderWithTestWrapper(BranchGutterCell, {
			row: singleHead,
			...defaultProps,
			signals: () => ({ sha: 's', ahead: 0, behind: 0 })
		});

		await expect.element(getByText('merged')).toBeInTheDocument();
		expect(container.textContent).not.toContain('0↓');
	});

	it('lists every co-located branch behind a "+N more" popover', async () => {
		const { getByRole } = renderWithTestWrapper(BranchGutterCell, {
			row: multiHead,
			...defaultProps
		});

		const more = getByRole('button', { name: '+2 more' });
		await expect.element(more).toBeInTheDocument();
		await more.click();

		await expect.element(getByRole('checkbox', { name: 'feature/b' })).toBeInTheDocument();
		await expect.element(getByRole('checkbox', { name: 'feature/c' })).toBeInTheDocument();
	});

	it('renders nothing for a non-head row', () => {
		const nonHead = computeGraph([mk('a', ['b']), mk('b', [])]).rows[0];
		const { container } = renderWithTestWrapper(BranchGutterCell, {
			row: nonHead,
			...defaultProps
		});
		expect(container.querySelector('input')).toBeNull();
	});
});

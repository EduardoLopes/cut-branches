import { describe, expect, it } from 'vitest';
import CommitRunRow from '../commit-run-row.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('CommitRunRow', () => {
	it('offers to show a collapsed run', async () => {
		const { getByText } = renderWithTestWrapper(CommitRunRow, {
			mode: 'collapsed',
			count: 7
		});
		await expect.element(getByText('Show 7 commits')).toBeInTheDocument();
	});

	it('offers to hide an expanded run', async () => {
		const { getByText } = renderWithTestWrapper(CommitRunRow, {
			mode: 'header',
			count: 7
		});
		await expect.element(getByText('Hide 7 commits')).toBeInTheDocument();
	});

	it('draws no graph lanes — the strip is a clean visual break', () => {
		const { container } = renderWithTestWrapper(CommitRunRow, {
			mode: 'collapsed',
			count: 7
		});

		expect(container.querySelectorAll('svg, path')).toHaveLength(0);
	});
});

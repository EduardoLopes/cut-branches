import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ChangedFileRow from '../changed-file-row.svelte';
import type { ChangedFile } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query',
	() => ({
		createGetFileDiffQuery: vi.fn(() => ({
			isLoading: false,
			isError: false,
			error: null,
			data: {
				path: 'src/app.ts',
				oldPath: null,
				status: 'modified',
				isBinary: false,
				truncated: false,
				hunks: []
			}
		}))
	})
);
vi.mock('$ui/patterns/diff-viewer/highlighter', () => ({
	highlightDiffCode: vi.fn(async () => null)
}));

const file = (overrides: Partial<ChangedFile> = {}): ChangedFile => ({
	path: 'src/app.ts',
	oldPath: null,
	status: 'modified',
	linesAdded: 20,
	linesRemoved: 4,
	isBinary: false,
	...overrides
});

const defaultProps = { repositoryPath: '/repo', branchName: 'feature/x', file: file() };

describe('ChangedFileRow', () => {
	it('shows the status badge, path, and line stats', async () => {
		const { getByText, container } = renderWithTestWrapper(ChangedFileRow, defaultProps);

		await expect.element(getByText('modified')).toBeInTheDocument();
		await expect.element(getByText('src/app.ts')).toBeInTheDocument();
		await expect.element(getByText('+20')).toBeInTheDocument();
		await expect.element(getByText('−4')).toBeInTheDocument();
		// Collapsed by default: no diff panel mounted.
		expect(container.querySelector('[data-testid="file-diff-panel"]')).toBeNull();
	});

	it('marks the parts of the path that match the search term', async () => {
		const { container, getByText } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			searchTerm: 'app'
		});

		await expect.element(getByText('modified')).toBeInTheDocument();
		const marked = [...container.querySelectorAll('[data-marked="true"]')];
		expect(marked).toHaveLength(1);
		expect(marked[0].textContent).toBe('app');
	});

	it('shows the rename source for renamed files', async () => {
		const { getByText } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			file: file({ status: 'renamed', path: 'src/new.ts', oldPath: 'src/old.ts' })
		});

		await expect.element(getByText('renamed')).toBeInTheDocument();
		await expect.element(getByText(/src\/old\.ts/)).toBeInTheDocument();
	});

	it('replaces line stats with a binary badge for binary files', async () => {
		const { getByText, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			file: file({ isBinary: true })
		});

		await expect.element(getByText('binary')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="changed-file-added"]')).toBeNull();
	});

	it('expands and collapses the diff panel via the toggle', async () => {
		const { getByRole, container } = renderWithTestWrapper(ChangedFileRow, defaultProps);

		const toggle = getByRole('button', { name: 'Show diff of src/app.ts' });
		await toggle.click();
		await tick();
		expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();

		await getByRole('button', { name: 'Hide diff of src/app.ts' }).click();
		await tick();
		expect(container.querySelector('[data-testid="file-diff-panel"]')).toBeNull();
	});

	it('marks the matching part of the file name while searching', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			searchTerm: 'app'
		});

		await vi.waitFor(() => {
			const marked = container.querySelector(
				'[data-testid="changed-file-path"] [data-marked="true"]'
			);
			expect(marked?.textContent).toBe('app');
		});
	});

	it('opens itself when the search term matches the diff content', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			searchTerm: 'needle',
			searchMatched: true
		});

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});

	it('keeps the file header sticky so it stays visible while its diff scrolls', async () => {
		const { getByText, container } = renderWithTestWrapper(ChangedFileRow, defaultProps);

		await expect.element(getByText('modified')).toBeInTheDocument();
		const row = container.querySelector('[data-testid="changed-file-row"]') as HTMLElement;
		const sticky = [...row.querySelectorAll<HTMLElement>('*')].find(
			(el) => getComputedStyle(el).position === 'sticky'
		);
		expect(sticky).toBeDefined();
		expect(getComputedStyle(sticky as HTMLElement).top).toBe('0px');
	});

	it('starts expanded when defaultExpanded is set', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			defaultExpanded: true
		});
		await tick();

		expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
	});
});

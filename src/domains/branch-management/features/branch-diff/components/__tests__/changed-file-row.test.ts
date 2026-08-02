import { tick } from 'svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ChangedFileRow from '../changed-file-row.svelte';
import { prefetchFileDiff } from '$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query';
import type { ChangedFile } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query',
	() => ({
		prefetchFileDiff: vi.fn(),
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
	beforeEach(() => {
		vi.mocked(prefetchFileDiff).mockClear();
	});

	describe('diff prefetch', () => {
		it('warms the file diff once hovering the row settles', async () => {
			const { getByTestId } = renderWithTestWrapper(ChangedFileRow, defaultProps);

			await getByTestId('changed-file-row').hover();

			// Debounced: a row the pointer merely crosses costs nothing.
			expect(prefetchFileDiff).not.toHaveBeenCalled();

			await vi.waitFor(
				() =>
					expect(prefetchFileDiff).toHaveBeenCalledWith(expect.anything(), {
						path: '/repo',
						branchName: 'feature/x',
						commitSha: null,
						filePath: 'src/app.ts',
						oldPath: null
					}),
				{ timeout: 1000 }
			);
		});

		it('does not warm a row whose panel is already mounted', async () => {
			const { getByTestId } = renderWithTestWrapper(ChangedFileRow, {
				...defaultProps,
				defaultExpanded: true
			});

			await getByTestId('changed-file-row').hover();
			await new Promise((resolve) => setTimeout(resolve, 300));

			expect(prefetchFileDiff).not.toHaveBeenCalled();
		});
	});

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

	it('opens when a reveal navigation targets it', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			revealSeq: 1
		});

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});

	it('starts expanded when defaultExpanded is set', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			defaultExpanded: true
		});
		await tick();

		expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
	});
	it('summarizes changed symbols and truncates past three', async () => {
		const symbol = (name: string) => ({
			name,
			kind: 'function' as const,
			startLine: 1,
			endLine: 2
		});
		const { container, getByText } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			structure: {
				symbols: [symbol('alpha'), symbol('beta'), symbol('gamma'), symbol('delta')],
				importsChanged: 0,
				importedByChanged: 0
			}
		});

		await expect.element(getByText('ƒ alpha, ƒ beta, ƒ gamma +1 more')).toBeInTheDocument();
		// With no import relations, the impact badges stay hidden.
		expect(container.querySelector('[data-testid="changed-file-imports"]')).toBeNull();
		expect(container.querySelector('[data-testid="changed-file-imported-by"]')).toBeNull();
	});

	it('shows glyphs per symbol kind without a +more suffix when all fit', async () => {
		const { getByText } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			structure: {
				symbols: [
					{ name: 'Box', kind: 'class' as const, startLine: 1, endLine: 9 },
					{ name: 'open', kind: 'method' as const, startLine: 2, endLine: 4 },
					{ name: 'card', kind: 'component' as const, startLine: 1, endLine: 30 }
				],
				importsChanged: 0,
				importedByChanged: 0
			}
		});

		await expect.element(getByText('C Box, ƒ open, ◇ card')).toBeInTheDocument();
	});

	it('shows import-impact badges only for non-zero counts', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			structure: { symbols: [], importsChanged: 2, importedByChanged: 0 }
		});
		await tick();

		const imports = container.querySelector('[data-testid="changed-file-imports"]');
		expect(imports?.textContent).toContain('2');
		expect(imports?.getAttribute('title')).toBe('Imports 2 changed files');
		expect(container.querySelector('[data-testid="changed-file-imported-by"]')).toBeNull();
		// No changed symbols -> no summary line either.
		expect(container.querySelector('[data-testid="changed-file-symbols"]')).toBeNull();
	});

	it('pluralizes the imported-by badge title correctly', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			structure: { symbols: [], importsChanged: 0, importedByChanged: 1 }
		});
		await tick();

		const importedBy = container.querySelector('[data-testid="changed-file-imported-by"]');
		expect(importedBy?.getAttribute('title')).toBe('Imported by 1 changed file');
	});

	it('renders without structure data exactly as before', async () => {
		const { container, getByText } = renderWithTestWrapper(ChangedFileRow, defaultProps);

		await expect.element(getByText('src/app.ts')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="changed-file-symbols"]')).toBeNull();
		expect(container.querySelector('[data-testid="changed-file-imports"]')).toBeNull();
		expect(container.querySelector('[data-testid="changed-file-imported-by"]')).toBeNull();
	});

	it('reports reviewed toggle clicks and reflects the reviewed flag', async () => {
		const onToggleReviewed = vi.fn();
		const { getByRole, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			reviewed: false,
			onToggleReviewed
		});

		const button = getByRole('button', { name: 'Mark src/app.ts reviewed' });
		await button.click();
		expect(onToggleReviewed).toHaveBeenCalledWith('src/app.ts');
		// Not reviewed yet: wrapper carries no dimming flag.
		expect(container.querySelector('[data-reviewed="true"]')).toBeNull();
	});

	it('dims the row and flips the label when reviewed', async () => {
		const { getByRole, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			reviewed: true,
			onToggleReviewed: vi.fn()
		});

		await expect
			.element(getByRole('button', { name: 'Mark src/app.ts not reviewed' }))
			.toBeInTheDocument();
		expect(container.querySelector('[data-reviewed="true"]')).not.toBeNull();
	});

	it('does not throw when the reviewed toggle has no handler', async () => {
		const { getByRole, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			reviewed: false
		});
		const button = getByRole('button', { name: 'Mark src/app.ts reviewed' });
		// The optional-chained handler is a no-op — clicking must stay harmless.
		await button.click();
		expect(container.querySelector('[data-testid="changed-file-row"]')).not.toBeNull();
	});

	it('opens the explanation panel when the Explain button is clicked', async () => {
		const { getByTestId, container } = renderWithTestWrapper(ChangedFileRow, defaultProps);
		expect(container.querySelector('[data-testid="explanation-panel"]')).toBeNull();
		await getByTestId('toggle-file-explanation').click();
		await expect.element(getByTestId('explanation-panel')).toBeInTheDocument();
	});

	it('hides the Explain affordance for binary files', async () => {
		const { container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			file: file({ isBinary: true })
		});
		expect(container.querySelector('[data-testid="toggle-file-explanation"]')).toBeNull();
	});

	it('renders a batch explanation panel from batchState', async () => {
		const { getByTestId } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			batchState: { text: 'Renames a helper for clarity.', status: 'done' }
		});
		await expect
			.element(getByTestId('explanation-text'))
			.toHaveTextContent('Renames a helper for clarity.');
	});

	it('surfaces a batch failure in the panel', async () => {
		const { getByTestId } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			batchState: { text: '', status: 'error', error: 'agent boom' }
		});
		await expect.element(getByTestId('explanation-error')).toHaveTextContent('agent boom');
	});

	it('renders a per-change batch inline and reveals the diff', async () => {
		const { getByTestId, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			batchState: {
				text: '@@HUNK 1@@\nDoes a thing.',
				status: 'done',
				hunks: new Map([[1, 'Does a thing.']])
			}
		});
		// Per-change batch → panel shows the inline hint and the diff is revealed.
		await expect.element(getByTestId('explanation-inline-hint')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});

	it('reveals the diff and opens the panel in per-change mode', async () => {
		const { getByTestId, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			explanationDetail: 'hunks'
		});
		// Per-change opens the panel AND expands the diff, where the per-hunk
		// comments render inline.
		await getByTestId('toggle-file-explanation').click();
		await expect.element(getByTestId('explanation-panel')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});

	it('lets one file override the global detail via its own dropdown', async () => {
		// Global default is whole-file; this file is switched to per-change.
		const { getByTestId, getByRole, container } = renderWithTestWrapper(ChangedFileRow, {
			...defaultProps,
			explanationDetail: 'file'
		});
		await getByTestId('explanation-detail-trigger').click();
		await tick();
		await getByRole('menuitemradio', { name: 'Per change' }).click();

		await expect.element(getByTestId('explanation-panel')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});
});

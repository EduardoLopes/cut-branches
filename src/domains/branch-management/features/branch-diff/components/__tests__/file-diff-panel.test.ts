import { describe, expect, it, vi, beforeEach } from 'vitest';
import FileDiffPanel from '../file-diff-panel.svelte';
import type { ChangedFile, GetFileDiffOutput } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query: {} as any,
	highlightDiffCode: vi.fn(async (): Promise<unknown> => null),
	executeCommand: vi.fn(async (): Promise<unknown> => ({
		lines: ['context a', 'context b'],
		totalLines: 10
	}))
}));

vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query',
	() => ({ createGetFileDiffQuery: vi.fn(() => h.query) })
);
vi.mock('$ui/patterns/diff-viewer/highlighter', () => ({
	highlightDiffCode: h.highlightDiffCode
}));
// Shrink the large-diff budgets so the gate/plain-text tiers are testable
// with small fixtures (the real thresholds are thousands of lines).
vi.mock('$ui/patterns/diff-viewer/render-budget', async (importOriginal) => ({
	...(await importOriginal<typeof import('$ui/patterns/diff-viewer/render-budget')>()),
	DIFF_HIGHLIGHT_MAX_LINES: 10,
	DIFF_RENDER_GATE_LINES: 20
}));
vi.mock('$infrastructure/tauri-commands', () => ({ executeCommand: h.executeCommand }));

const file = (overrides: Partial<ChangedFile> = {}): ChangedFile => ({
	path: 'src/app.ts',
	oldPath: null,
	status: 'modified',
	linesAdded: 2,
	linesRemoved: 1,
	isBinary: false,
	...overrides
});

const diff = (overrides: Partial<GetFileDiffOutput> = {}): GetFileDiffOutput => ({
	path: 'src/app.ts',
	oldPath: null,
	status: 'modified',
	isBinary: false,
	truncated: false,
	hunks: [
		{
			header: '@@ -1,2 +1,2 @@',
			oldStart: 1,
			oldLines: 2,
			newStart: 1,
			newLines: 2,
			lines: [
				{ kind: 'context', content: 'unchanged line', oldLineNo: 1, newLineNo: 1 },
				{ kind: 'removed', content: 'old line', oldLineNo: 2, newLineNo: null },
				{ kind: 'added', content: 'new line', oldLineNo: null, newLineNo: 2 }
			]
		}
	],
	...overrides
});

function setQuery(state: {
	isLoading?: boolean;
	isError?: boolean;
	error?: { message: string; description?: string | null };
	data?: GetFileDiffOutput;
}) {
	h.query = { isLoading: false, isError: false, error: null, data: undefined, ...state };
}

const defaultProps = { repositoryPath: '/repo', branchName: 'feature/x', file: file() };

beforeEach(() => {
	h.highlightDiffCode.mockClear();
	h.highlightDiffCode.mockResolvedValue(null);
	h.executeCommand.mockClear();
	h.executeCommand.mockResolvedValue({ lines: ['context a', 'context b'], totalLines: 10 });
});

describe('FileDiffPanel', () => {
	it('shows a loading indicator while the diff is fetched', async () => {
		setQuery({ isLoading: true });
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('Loading diff…')).toBeInTheDocument();
	});

	it('surfaces query errors, preferring the description', async () => {
		setQuery({
			isError: true,
			error: { message: 'Failed', description: 'File **x** is not part of this diff' }
		});
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('File **x** is not part of this diff')).toBeInTheDocument();
	});

	it('falls back to the error message when there is no description', async () => {
		setQuery({ isError: true, error: { message: 'Failed to compute diff', description: null } });
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('Failed to compute diff')).toBeInTheDocument();
	});

	it('explains binary files instead of rendering hunks', async () => {
		setQuery({ data: diff({ isBinary: true, hunks: [] }) });
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText(/Binary file/)).toBeInTheDocument();
	});

	it('explains empty diffs, calling out pure renames', async () => {
		setQuery({ data: diff({ status: 'renamed', hunks: [] }) });
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText(/file was renamed/)).toBeInTheDocument();
	});

	it('renders hunk headers and lines with a single own-side gutter number', async () => {
		setQuery({ data: diff() });
		const { getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('@@ -1,2 +1,2 @@')).toBeInTheDocument();
		await expect.element(getByText('unchanged line')).toBeInTheDocument();

		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		expect(lines).toHaveLength(3);
		expect(lines.map((l) => l.getAttribute('data-kind'))).toEqual(['context', 'removed', 'added']);
		// Single gutter: each line shows its own side's number — the old-side
		// number for removed lines, the new-side one otherwise.
		const cells = (line: Element) => [...line.querySelectorAll('span')].map((s) => s.textContent);
		expect(cells(lines[1])[0]).toBe('2');
		expect(cells(lines[2])[0]).toBe('2');
	});

	it('renders the classic old/new number pair when gutter is double', async () => {
		setQuery({ data: diff() });
		const { container } = renderWithTestWrapper(FileDiffPanel, {
			...defaultProps,
			gutter: 'double' as const
		});

		await vi.waitFor(() => {
			const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
			expect(lines).toHaveLength(3);
			// Removed lines carry only an old line number; added only a new one.
			const cells = (line: Element) => [...line.querySelectorAll('span')].map((s) => s.textContent);
			expect(cells(lines[1])[0]).toBe('2');
			expect(cells(lines[1])[1]).toBe('');
			expect(cells(lines[2])[0]).toBe('');
			expect(cells(lines[2])[1]).toBe('2');
		});
	});

	it('renders highlighted tokens once shiki resolves', async () => {
		setQuery({
			data: diff({
				hunks: [
					{
						header: '@@ -1 +1 @@',
						oldStart: 1,
						oldLines: 1,
						newStart: 1,
						newLines: 1,
						lines: [{ kind: 'added', content: 'const x = 1', oldLineNo: null, newLineNo: 1 }]
					}
				]
			})
		});
		h.highlightDiffCode.mockResolvedValue([
			[
				{ content: 'const', color: '#ff0000' },
				{ content: ' x = 1', color: '#00ff00' }
			]
		]);

		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('const', { exact: true })).toBeInTheDocument();
		expect(h.highlightDiffCode).toHaveBeenCalledWith('const x = 1', 'typescript');
	});

	it('offers a tail expander for modified files and merges the loaded lines in', async () => {
		setQuery({ data: diff() });
		const { getByRole, getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		const expander = getByRole('button', { name: 'Expand rest of file' });
		await expect.element(expander).toBeInTheDocument();

		await expander.click();

		await expect.element(getByText('context a')).toBeInTheDocument();
		expect(h.executeCommand).toHaveBeenCalledWith('getFileLines', {
			path: '/repo',
			branchName: 'feature/x',
			commitSha: null,
			filePath: 'src/app.ts',
			startLine: 3,
			endLine: 0
		});
		// The loaded lines join the container as context rows with continuous
		// line numbers (new side 3.., old side offset by the hunk delta).
		const context = container.querySelector('[data-testid="diff-expanded-context"]');
		const rows = [...(context?.querySelectorAll('[data-testid="diff-line"]') ?? [])];
		expect(rows).toHaveLength(2);
		expect(rows.every((row) => row.getAttribute('data-kind') === 'context')).toBe(true);
		// The expander itself is gone once filled.
		expect(container.querySelector('[data-testid="diff-gap-expander"]')).toBeNull();
	});

	it('drops the following hunk header once the gap between hunks is expanded', async () => {
		setQuery({
			data: diff({
				hunks: [
					{
						header: '@@ -1,2 +1,2 @@',
						oldStart: 1,
						oldLines: 2,
						newStart: 1,
						newLines: 2,
						lines: [{ kind: 'context', content: 'first hunk', oldLineNo: 1, newLineNo: 1 }]
					},
					{
						header: '@@ -5,2 +5,2 @@',
						oldStart: 5,
						oldLines: 2,
						newStart: 5,
						newLines: 2,
						lines: [{ kind: 'context', content: 'second hunk', oldLineNo: 5, newLineNo: 5 }]
					}
				],
				status: 'added'
			})
		});
		const { getByRole, getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('@@ -5,2 +5,2 @@')).toBeInTheDocument();

		await getByRole('button', { name: 'Expand 2 hidden lines' }).click();

		await expect.element(getByText('context a')).toBeInTheDocument();
		// Line numbers are continuous now, so the second header is dropped and
		// both hunks read as one merged block.
		expect(container.textContent).not.toContain('@@ -5,2 +5,2 @@');
		expect(h.executeCommand).toHaveBeenCalledWith(
			'getFileLines',
			expect.objectContaining({ startLine: 3, endLine: 4 })
		);
	});

	it('shows no expanders for added files fully covered by their hunk', async () => {
		setQuery({
			data: diff({
				status: 'added',
				hunks: [
					{
						header: '@@ -0,0 +1,2 @@',
						oldStart: 0,
						oldLines: 0,
						newStart: 1,
						newLines: 2,
						lines: [{ kind: 'added', content: 'new file', oldLineNo: null, newLineNo: 1 }]
					}
				]
			})
		});
		const { getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('new file')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-gap-expander"]')).toBeNull();
	});

	it('surfaces expansion failures inline and keeps the expander usable', async () => {
		h.executeCommand.mockRejectedValueOnce({ message: 'Failed', description: 'File is gone' });
		setQuery({ data: diff() });
		const { getByRole, getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await getByRole('button', { name: 'Expand rest of file' }).click();

		await expect.element(getByText('File is gone')).toBeInTheDocument();
		await expect.element(getByRole('button', { name: 'Expand rest of file' })).toBeInTheDocument();
	});

	it('marks search-term occurrences inside the code', async () => {
		setQuery({ data: diff() });
		const { container } = renderWithTestWrapper(FileDiffPanel, {
			...defaultProps,
			searchTerm: 'line'
		});

		await vi.waitFor(() => {
			const marked = [...container.querySelectorAll('[data-marked="true"]')];
			// 'line' occurs once in each of the three diff lines.
			expect(marked).toHaveLength(3);
			expect(marked.every((el) => el.textContent === 'line')).toBe(true);
		});
	});

	it('notes when a very large diff was truncated', async () => {
		setQuery({ data: diff({ truncated: true }) });
		const { getByText } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText(/truncated/)).toBeInTheDocument();
	});

	// --- Large-diff tiers (budgets shrunk by the render-budget mock above) ----

	const manyLines = (count: number) =>
		diff({
			hunks: [
				{
					header: `@@ -1,${count} +1,${count} @@`,
					oldStart: 1,
					oldLines: count,
					newStart: 1,
					newLines: count,
					lines: Array.from({ length: count }, (_, i) => ({
						kind: 'context' as const,
						content: `line ${i}`,
						oldLineNo: i + 1,
						newLineNo: i + 1
					}))
				}
			]
		});

	it('gates very large diffs behind a message instead of rendering them', async () => {
		setQuery({ data: manyLines(21) });
		const { getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText(/very large \(21 lines\)/)).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-viewer"]')).toBeNull();
	});

	it('never re-gates a rendered diff when expanded context pushes it past the gate', async () => {
		// 19 hunk lines sit under the (mocked) gate of 20; expanding the tail
		// adds 2 context lines for a total of 21. The gate counts only the
		// diff's own lines, so the rendered diff must stay.
		setQuery({ data: manyLines(19) });
		const { getByRole, getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await getByRole('button', { name: 'Expand rest of file' }).click();

		await expect.element(getByText('context a')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="file-diff-large"]')).toBeNull();
	});

	it('renders a gated diff on demand, as plain text with a notice', async () => {
		setQuery({ data: manyLines(21) });
		const { getByRole, getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await getByRole('button', { name: 'Show diff' }).click();

		await expect.element(getByText('line 0', { exact: true })).toBeInTheDocument();
		expect(container.querySelector('[data-testid="file-diff-large"]')).toBeNull();
		await expect
			.element(getByText('Syntax highlighting is off for this large diff.'))
			.toBeInTheDocument();
		expect(h.highlightDiffCode).not.toHaveBeenCalled();
	});

	it('skips highlighting (with a notice) for diffs over the highlight budget but under the gate', async () => {
		setQuery({ data: manyLines(15) });
		const { getByText, container } = renderWithTestWrapper(FileDiffPanel, defaultProps);

		await expect.element(getByText('line 0', { exact: true })).toBeInTheDocument();
		expect(container.querySelector('[data-testid="file-diff-large"]')).toBeNull();
		await expect
			.element(getByText('Syntax highlighting is off for this large diff.'))
			.toBeInTheDocument();
		expect(h.highlightDiffCode).not.toHaveBeenCalled();
	});

	it('omits the plain-text notice when the file has no highlight language anyway', async () => {
		setQuery({ data: manyLines(15) });
		const { getByText, container } = renderWithTestWrapper(FileDiffPanel, {
			...defaultProps,
			file: file({ path: 'LICENSE' })
		});

		await expect.element(getByText('line 0', { exact: true })).toBeInTheDocument();
		expect(container.querySelector('[data-testid="file-diff-plain-text"]')).toBeNull();
	});
});

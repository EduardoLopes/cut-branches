import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiffViewer from '../diff-viewer.svelte';
import type { DiffViewerHunk, DiffViewerLine } from '../types';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	highlightDiffCode: vi.fn(async (): Promise<unknown> => null)
}));

vi.mock('$ui/patterns/diff-viewer/highlighter', () => ({
	highlightDiffCode: h.highlightDiffCode
}));

const hunk = (overrides: Partial<DiffViewerHunk> = {}): DiffViewerHunk => ({
	header: '@@ -1,2 +1,2 @@',
	oldStart: 1,
	oldLines: 2,
	newStart: 1,
	newLines: 2,
	lines: [
		{ kind: 'context', content: 'unchanged line', oldLineNo: 1, newLineNo: 1 },
		{ kind: 'removed', content: 'old line', oldLineNo: 2, newLineNo: null },
		{ kind: 'added', content: 'new line', oldLineNo: null, newLineNo: 2 }
	],
	...overrides
});

beforeEach(() => {
	h.highlightDiffCode.mockClear();
	h.highlightDiffCode.mockResolvedValue(null);
});

describe('DiffViewer', () => {
	it('renders unified rows with the single own-side gutter by default', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, { hunks: [hunk()] });

		await expect.element(getByText('unchanged line')).toBeInTheDocument();
		const rows = container.querySelector('[data-layout="unified"]');
		expect(rows?.getAttribute('data-variant')).toBe('background');
		expect(rows?.getAttribute('data-gutter')).toBe('single');
		expect(rows?.getAttribute('data-wrap')).toBe('false');

		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		const firstCell = (line: Element) => line.querySelector('span')?.textContent;
		// Own-side numbers: old for removed, new otherwise.
		expect(firstCell(lines[1])).toBe('2');
		expect(firstCell(lines[2])).toBe('2');
	});

	it('scrolls horizontally only, letting vertical wheel chain to the page', async () => {
		const { container } = renderWithTestWrapper(DiffViewer, { hunks: [hunk()] });

		const block = container.querySelector('[data-testid="diff-viewer"]') as HTMLElement;
		const scroll = block.firstElementChild as HTMLElement;
		const cs = getComputedStyle(scroll);
		// overflow-y must NOT resolve to a scrolling value: left implicit it would
		// compute to `auto` (one-axis-scrolls rule) and trap the page's vertical
		// wheel whenever the pointer is over the diff.
		expect(cs.overflowX).toBe('auto');
		expect(cs.overflowY).toBe('hidden');
	});

	it('renders old/new number pairs in double-gutter mode', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			gutter: 'double' as const
		});

		await expect.element(getByText('old line')).toBeInTheDocument();
		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		const cells = (line: Element) => [...line.querySelectorAll('span')].map((s) => s.textContent);
		expect(cells(lines[1])[0]).toBe('2');
		expect(cells(lines[1])[1]).toBe('');
		expect(cells(lines[2])[0]).toBe('');
		expect(cells(lines[2])[1]).toBe('2');
	});

	it('adds a +/− marker column only in the markers variant', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			variant: 'markers' as const
		});

		await expect.element(getByText('new line')).toBeInTheDocument();
		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		const cells = (line: Element) => [...line.querySelectorAll('span')].map((s) => s.textContent);
		expect(cells(lines[1])).toContain('−');
		expect(cells(lines[2])).toContain('+');
	});

	it('omits markers outside the markers variant and stamps the bars variant attribute', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			variant: 'bars' as const
		});

		await expect.element(getByText('new line')).toBeInTheDocument();
		expect(container.textContent).not.toContain('−');
		expect(container.querySelector('[data-variant="bars"]')).not.toBeNull();
	});

	it('stamps the wrap attribute when wrapping is enabled', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			wrap: true
		});

		await expect.element(getByText('new line')).toBeInTheDocument();
		expect(container.querySelector('[data-wrap="true"]')).not.toBeNull();
	});

	it('pairs removed and added lines side by side in split layout', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			layout: 'split' as const
		});

		await expect.element(getByText('old line')).toBeInTheDocument();
		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		// context row + one paired removed/added row
		expect(lines).toHaveLength(2);
		expect(lines[1].textContent).toContain('old line');
		expect(lines[1].textContent).toContain('new line');
	});

	it('renders an empty cell for the unpaired side in split layout', async () => {
		// Tokens resolve here so the unpaired (null-index) side exercises the
		// token zip alongside real token arrays.
		h.highlightDiffCode.mockResolvedValue([
			[{ content: 'gone 1', color: '#ff0000' }],
			[{ content: 'gone 2', color: '#ff0000' }],
			[{ content: 'kept', color: '#00ff00' }]
		]);
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						{ kind: 'removed', content: 'gone 1', oldLineNo: 1, newLineNo: null },
						{ kind: 'removed', content: 'gone 2', oldLineNo: 2, newLineNo: null },
						{ kind: 'added', content: 'kept', oldLineNo: null, newLineNo: 1 }
					]
				})
			],
			layout: 'split' as const,
			language: 'typescript'
		});

		await expect.element(getByText('gone 2')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-empty-side"]')).toHaveLength(1);
			expect(container.querySelector('span[style]')?.textContent).toBe('gone 1');
		});
	});

	it('falls back to plain text for split lines the token arrays do not cover', async () => {
		// One token array for two lines — the second line renders unstyled.
		h.highlightDiffCode.mockResolvedValue([[{ content: 'old line', color: '#ff0000' }]]);
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						{ kind: 'removed', content: 'old line', oldLineNo: 1, newLineNo: null },
						{ kind: 'added', content: 'new line', oldLineNo: null, newLineNo: 1 }
					]
				})
			],
			layout: 'split' as const,
			language: 'typescript'
		});

		await expect.element(getByText('new line')).toBeInTheDocument();
		await vi.waitFor(() => {
			const styled = [...container.querySelectorAll('span[style]')].map((el) => el.textContent);
			expect(styled).toContain('old line');
			expect(styled).not.toContain('new line');
		});
	});

	it('renders split rows as plain text while highlighting is pending', async () => {
		h.highlightDiffCode.mockReturnValue(new Promise(() => {}));
		const { getByText } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			layout: 'split' as const,
			language: 'typescript'
		});

		await expect.element(getByText('old line')).toBeInTheDocument();
		await expect.element(getByText('new line')).toBeInTheDocument();
	});

	it('drops the expander for a gap that expanded to nothing', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			onExpandGap: vi.fn(),
			expandedGaps: new Map([['gap-tail', []]])
		});

		await expect.element(getByText('unchanged line')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-gap-expander"]')).toBeNull();
		expect(container.querySelector('[data-testid="diff-expanded-context"]')).toBeNull();
	});

	it('renders highlighted tokens once shiki resolves', async () => {
		h.highlightDiffCode.mockResolvedValue([
			[
				{ content: 'const', color: '#ff0000' },
				{ content: ' x = 1', color: '#00ff00' }
			]
		]);
		const { getByText } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [{ kind: 'added', content: 'const x = 1', oldLineNo: null, newLineNo: 1 }]
				})
			],
			language: 'typescript'
		});

		await expect.element(getByText('const', { exact: true })).toBeInTheDocument();
		expect(h.highlightDiffCode).toHaveBeenCalledWith('const x = 1', 'typescript');
	});

	it('zips highlighted tokens onto the right lines in split layout', async () => {
		h.highlightDiffCode.mockResolvedValue([
			[{ content: 'old line', color: '#ff0000' }],
			[{ content: 'new line', color: '#00ff00' }]
		]);
		const { container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						{ kind: 'removed', content: 'old line', oldLineNo: 1, newLineNo: null },
						{ kind: 'added', content: 'new line', oldLineNo: null, newLineNo: 1 }
					]
				})
			],
			layout: 'split' as const,
			language: 'typescript'
		});

		await vi.waitFor(() => {
			const colored = [...container.querySelectorAll('span[style]')];
			expect(colored.some((el) => el.textContent === 'old line')).toBe(true);
			expect(colored.some((el) => el.textContent === 'new line')).toBe(true);
		});
	});

	it('marks search-term occurrences inside the code', async () => {
		const { container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			searchTerm: 'line'
		});

		await vi.waitFor(() => {
			const marked = [...container.querySelectorAll('[data-marked="true"]')];
			expect(marked).toHaveLength(3);
			expect(marked.every((el) => el.textContent === 'line')).toBe(true);
		});
	});

	it('shows no gap expanders when no onExpandGap callback is provided', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, { hunks: [hunk()] });

		await expect.element(getByText('unchanged line')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-gap-expander"]')).toBeNull();
	});

	it('labels a one-line gap in the singular', async () => {
		const { getByRole } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ newStart: 2, oldStart: 2 })],
			status: 'added' as const,
			onExpandGap: vi.fn()
		});

		await expect.element(getByRole('button', { name: 'Expand 1 hidden line' })).toBeInTheDocument();
	});

	it('leaves the gutter cell empty when a line has no number on its side', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [{ kind: 'context', content: 'numberless', oldLineNo: null, newLineNo: null }]
				})
			]
		});

		await expect.element(getByText('numberless')).toBeInTheDocument();
		const line = container.querySelector('[data-testid="diff-line"]');
		expect(line?.querySelector('span')?.textContent).toBe('');
	});

	it('fires onExpandGap with the clicked gap', async () => {
		const onExpandGap = vi.fn();
		const { getByRole } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			onExpandGap
		});

		await getByRole('button', { name: 'Expand rest of file' }).click();

		expect(onExpandGap).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'gap-tail', startLine: 3, endLine: 0 })
		);
	});

	it('disables the expander and relabels it while its gap is loading', async () => {
		const { getByRole } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			onExpandGap: vi.fn(),
			loadingGaps: new Set(['gap-tail'])
		});

		const button = getByRole('button', { name: 'Expand rest of file' });
		await expect.element(button).toBeDisabled();
		await expect
			.element(getByRole('button', { name: 'Expand rest of file' }))
			.toHaveTextContent('Loading…');
	});

	it('surfaces gap errors next to the expander', async () => {
		const { getByText } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			onExpandGap: vi.fn(),
			gapErrors: new Map([['gap-tail', 'File is gone']])
		});

		await expect.element(getByText('File is gone')).toBeInTheDocument();
	});

	it('renders expanded gap lines in place and drops the following hunk header', async () => {
		const hunks = [
			hunk({
				header: '@@ -1,1 +1,1 @@',
				oldLines: 1,
				newLines: 1,
				lines: [{ kind: 'context', content: 'first hunk', oldLineNo: 1, newLineNo: 1 }]
			}),
			hunk({
				header: '@@ -5,1 +5,1 @@',
				oldStart: 5,
				oldLines: 1,
				newStart: 5,
				newLines: 1,
				lines: [{ kind: 'context', content: 'second hunk', oldLineNo: 5, newLineNo: 5 }]
			})
		];
		const expanded: DiffViewerLine[] = [
			{ kind: 'context', content: 'between a', oldLineNo: 2, newLineNo: 2 },
			{ kind: 'context', content: 'between b', oldLineNo: 3, newLineNo: 3 }
		];
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks,
			status: 'added' as const,
			onExpandGap: vi.fn(),
			expandedGaps: new Map([['gap-1', expanded]])
		});

		await expect.element(getByText('between a')).toBeInTheDocument();
		expect(container.textContent).not.toContain('@@ -5,1 +5,1 @@');
		expect(
			container.querySelectorAll('[data-testid="diff-expanded-context"] [data-testid="diff-line"]')
		).toHaveLength(2);
	});

	it('renders the annotation snippet under matching lines', async () => {
		const lineAnnotation = createRawSnippet((line: () => DiffViewerLine) => ({
			render: () => `<span data-testid="note">note for ${line().kind}</span>`
		}));
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			lineAnnotation
		});

		await expect.element(getByText('note for context')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="diff-line-annotation"]')).toHaveLength(3);
	});

	it('annotates split rows once, preferring the new side', async () => {
		const lineAnnotation = createRawSnippet((line: () => DiffViewerLine) => ({
			render: () => `<span>note:${line().kind}:${line().content}</span>`
		}));
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						{ kind: 'removed', content: 'old line', oldLineNo: 1, newLineNo: null },
						{ kind: 'added', content: 'new line', oldLineNo: null, newLineNo: 1 }
					]
				})
			],
			layout: 'split' as const,
			lineAnnotation
		});

		await expect.element(getByText('note:added:new line')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="diff-line-annotation"]')).toHaveLength(1);
	});

	it('renders empty marker cells for unpaired sides in the split markers variant', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						{ kind: 'removed', content: 'gone', oldLineNo: 1, newLineNo: null },
						{ kind: 'added', content: 'kept 1', oldLineNo: null, newLineNo: 1 },
						{ kind: 'added', content: 'kept 2', oldLineNo: null, newLineNo: 2 }
					]
				})
			],
			layout: 'split' as const,
			variant: 'markers' as const
		});

		await expect.element(getByText('kept 2')).toBeInTheDocument();
		const lines = [...container.querySelectorAll('[data-testid="diff-line"]')];
		expect(lines[0].textContent).toContain('−');
		expect(lines[0].textContent).toContain('+');
		// The unpaired row keeps the marker column's grid slot with an empty cell.
		expect(lines[1].querySelectorAll('[data-kind="empty"]').length).toBeGreaterThan(1);
	});

	it('hovering token runs is inert without an onTokenHover callback', async () => {
		const { getByText } = renderWithTestWrapper(DiffViewer, { hunks: [hunk()] });

		await getByText('old line').hover();

		await expect.element(getByText('old line')).toBeInTheDocument();
	});

	it('skips highlighting past the budget and renders plain rows', async () => {
		const lines: DiffViewerLine[] = Array.from({ length: 1001 }, (_, i) => ({
			kind: 'context',
			content: `line ${i}`,
			oldLineNo: i + 1,
			newLineNo: i + 1
		}));
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ oldLines: 1001, newLines: 1001, lines })],
			language: 'typescript'
		});

		await expect.element(getByText('line 0', { exact: true })).toBeInTheDocument();
		// Over budget: no tokenize pass at all…
		expect(h.highlightDiffCode).not.toHaveBeenCalled();
		// …and no per-run spans (bare text nodes keep the mount cheap).
		expect(container.querySelector('[data-testid="diff-line"] span[role="presentation"]')).toBe(
			null
		);
	});

	it('renders split rows synchronously past the highlight budget', async () => {
		const lines: DiffViewerLine[] = Array.from({ length: 1001 }, (_, i) => ({
			kind: 'added',
			content: `added ${i}`,
			oldLineNo: null,
			newLineNo: i + 1
		}));
		const { getByText, container } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ oldLines: 0, newLines: 1001, lines })],
			layout: 'split' as const,
			language: 'typescript'
		});

		await expect.element(getByText('added 0', { exact: true })).toBeInTheDocument();
		expect(h.highlightDiffCode).not.toHaveBeenCalled();
		expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(1001);
	});

	it('fires onTokenHover when the pointer enters a token run', async () => {
		const onTokenHover = vi.fn();
		const { getByText } = renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			onTokenHover
		});

		await getByText('old line').hover();

		expect(onTokenHover).toHaveBeenCalledWith({
			content: 'old line',
			line: expect.objectContaining({ kind: 'removed' })
		});
	});
});

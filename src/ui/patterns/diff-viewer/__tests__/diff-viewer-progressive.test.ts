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

// Shrink the progressive thresholds so a handful of lines exercises the
// large-diff streaming path (the real floor is thousands of lines). A tiny
// frame batch forces several rAF ticks even for small fixtures, so the ramp
// itself is what fills the rows in.
vi.mock('$ui/patterns/diff-viewer/render-budget', async (importOriginal) => ({
	...(await importOriginal<typeof import('$ui/patterns/diff-viewer/render-budget')>()),
	DIFF_PROGRESSIVE_MIN_LINES: 4,
	DIFF_PROGRESSIVE_INITIAL_BATCH: 2,
	DIFF_PROGRESSIVE_FRAME_BATCH: 2
}));

const linesOf = (count: number, prefix = 'line'): DiffViewerLine[] =>
	Array.from({ length: count }, (_, i) => ({
		kind: 'context' as const,
		content: `${prefix} ${i}`,
		oldLineNo: i + 1,
		newLineNo: i + 1
	}));

const hunk = (overrides: Partial<DiffViewerHunk> = {}): DiffViewerHunk => ({
	header: '@@ -1,6 +1,6 @@',
	oldStart: 1,
	oldLines: 6,
	newStart: 1,
	newLines: 6,
	lines: linesOf(6),
	...overrides
});

beforeEach(() => {
	h.highlightDiffCode.mockClear();
	h.highlightDiffCode.mockResolvedValue(null);
});

describe('DiffViewer — progressive mounting', () => {
	it('streams every row in over frames without highlighting', async () => {
		const { container } = await renderWithTestWrapper(DiffViewer, {
			hunks: [hunk()],
			language: 'typescript'
		});

		// The first paint mounts only the initial batch (2 rows), not all 6…
		const firstBatch = container.querySelectorAll('[data-testid="diff-line"]').length;
		expect(firstBatch).toBeLessThan(6);

		// …and the rAF ramp fills the rest in without a synchronous mount of all.
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(6);
			expect(container.querySelector('[data-testid="diff-hunk-header"]')).not.toBeNull();
		});
		// Past the highlight budget the streamed rows stay plain text.
		expect(h.highlightDiffCode).not.toHaveBeenCalled();
	});

	it('streams split rows in the flat path too', async () => {
		const { getByText, container } = await renderWithTestWrapper(DiffViewer, {
			hunks: [
				hunk({
					lines: [
						...linesOf(4, 'ctx'),
						{ kind: 'removed', content: 'gone', oldLineNo: 5, newLineNo: null },
						{ kind: 'added', content: 'kept', oldLineNo: null, newLineNo: 5 }
					]
				})
			],
			layout: 'split' as const
		});

		await expect.element(getByText('kept')).toBeInTheDocument();
		// 4 context rows + one paired removed/added row.
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(5);
			expect(container.querySelector('[data-testid="diff-empty-side"]')).toBeNull();
		});
	});

	it('renders gap expanders in the flat path and expands them in place', async () => {
		const onExpandGap = vi.fn();
		// newStart 3 → a leading gap before the hunk; modified → a tail gap.
		const { getByRole, container } = await renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ newStart: 3, oldStart: 3 })],
			status: 'modified' as const,
			onExpandGap
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-gap-expander"]').length).toBe(2);
		});

		await getByRole('button', { name: 'Expand 2 hidden lines' }).click();
		expect(onExpandGap).toHaveBeenCalledWith(expect.objectContaining({ id: 'gap-0' }));
	});

	it('grows the mounted window when a gap fills with new lines', async () => {
		const expanded: DiffViewerLine[] = linesOf(3, 'ctx-extra');
		const { getByText, container } = await renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ newStart: 3, oldStart: 3 })],
			status: 'modified' as const,
			onExpandGap: vi.fn(),
			expandedGaps: new Map([['gap-0', expanded]])
		});

		// The 3 injected context lines stream in alongside the hunk's own rows.
		await expect.element(getByText('ctx-extra 0')).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(9);
		});
	});

	it('re-streams instead of synchronously remounting on a layout switch', async () => {
		const hunks = [hunk({ lines: linesOf(12) })];
		const { container, rerender } = await renderWithTestWrapper(DiffViewer, {
			hunks,
			layout: 'unified' as const
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(12);
		});

		await rerender({ componentProps: { hunks, layout: 'split' as const } });

		// The mounted window drops back to the initial batch — the new plan is
		// not mounted in one synchronous tick…
		expect(container.querySelectorAll('[data-testid="diff-line"]').length).toBeLessThan(12);
		// …and the rAF ramp fills the split rows back in.
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(12);
		});
	});

	it('mounts everything at once when the plan already fits the initial batch', async () => {
		// Just past the progressive floor (4) but no bigger than the initial
		// batch counted with its header, so the first pump completes the ramp.
		const { container } = await renderWithTestWrapper(DiffViewer, {
			hunks: [hunk({ header: '@@ -1,4 +1,4 @@', oldLines: 4, newLines: 4, lines: linesOf(4) })]
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-line"]')).toHaveLength(4);
		});
	});
});

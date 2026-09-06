import type { DiffViewerFileStatus, DiffViewerHunk } from './types';

/**
 * A run of unchanged lines the diff hides — before the first hunk, between
 * hunks, or after the last one. Line numbers refer to the diff's TARGET side
 * (the branch tip / commit), which is where expansion content is read from.
 */
export interface DiffGap {
	/** Stable id: `gap-<hunk index it precedes>` or `gap-tail`. */
	id: string;
	/** Index of the hunk this gap sits before; `null` for the tail gap. */
	beforeHunkIndex: number | null;
	/** First hidden line, 1-based inclusive (new side). */
	startLine: number;
	/** Last hidden line, inclusive. `0` means "through end of file". */
	endLine: number;
	/** Add to a new-side line number to get its old-side counterpart. */
	oldDelta: number;
	/** Hidden line count; `null` when unknown (tail gap — EOF not known). */
	count: number | null;
}

/**
 * Computes the expandable gaps around a file diff's hunks.
 *
 * Deleted files have no target side to read from, so they get no gaps; added
 * files are fully covered by their single hunk, so they get no tail gap.
 */
export function computeDiffGaps(hunks: DiffViewerHunk[], status: DiffViewerFileStatus): DiffGap[] {
	if (status === 'deleted' || hunks.length === 0) {
		return [];
	}

	const gaps: DiffGap[] = [];

	const first = hunks[0];
	if (first.newStart > 1) {
		gaps.push({
			id: 'gap-0',
			beforeHunkIndex: 0,
			startLine: 1,
			endLine: first.newStart - 1,
			oldDelta: first.oldStart - first.newStart,
			count: first.newStart - 1
		});
	}

	for (let i = 0; i < hunks.length - 1; i += 1) {
		const prev = hunks[i];
		const next = hunks[i + 1];
		const startLine = prev.newStart + prev.newLines;
		const endLine = next.newStart - 1;
		if (endLine >= startLine) {
			gaps.push({
				id: `gap-${i + 1}`,
				beforeHunkIndex: i + 1,
				startLine,
				endLine,
				oldDelta: next.oldStart - next.newStart,
				count: endLine - startLine + 1
			});
		}
	}

	if (status !== 'added') {
		const last = hunks[hunks.length - 1];
		gaps.push({
			id: 'gap-tail',
			beforeHunkIndex: null,
			startLine: last.newStart + last.newLines,
			endLine: 0,
			oldDelta: last.oldStart + last.oldLines - (last.newStart + last.newLines),
			count: null
		});
	}

	return gaps;
}

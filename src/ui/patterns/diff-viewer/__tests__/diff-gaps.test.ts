import { describe, expect, it } from 'vitest';
import { computeDiffGaps } from '../diff-gaps';
import type { DiffViewerHunk as DiffHunk } from '../types';

const hunk = (
	oldStart: number,
	oldLines: number,
	newStart: number,
	newLines: number
): DiffHunk => ({
	header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
	oldStart,
	oldLines,
	newStart,
	newLines,
	lines: []
});

describe('computeDiffGaps', () => {
	it('returns a leading gap, in-between gaps, and an open-ended tail gap', () => {
		const gaps = computeDiffGaps([hunk(3, 7, 3, 6), hunk(19, 6, 18, 7)], 'modified');

		expect(gaps).toEqual([
			{ id: 'gap-0', beforeHunkIndex: 0, startLine: 1, endLine: 2, oldDelta: 0, count: 2 },
			{ id: 'gap-1', beforeHunkIndex: 1, startLine: 9, endLine: 17, oldDelta: 1, count: 9 },
			{ id: 'gap-tail', beforeHunkIndex: null, startLine: 25, endLine: 0, oldDelta: 0, count: null }
		]);
	});

	it('maps new-side line numbers to old-side ones through oldDelta', () => {
		// Second hunk starts at old 100 / new 90: ten lines were removed above.
		const gaps = computeDiffGaps([hunk(1, 5, 1, 5), hunk(100, 3, 90, 3)], 'modified');

		const between = gaps.find((gap) => gap.id === 'gap-1');
		expect(between?.oldDelta).toBe(10);
		// A context line at new 50 corresponds to old 60.
		expect(50 + (between?.oldDelta ?? 0)).toBe(60);
	});

	it('omits the leading gap when the first hunk starts at line 1', () => {
		const gaps = computeDiffGaps([hunk(1, 3, 1, 4)], 'modified');

		expect(gaps.map((gap) => gap.id)).toEqual(['gap-tail']);
	});

	it('omits adjacent-hunk gaps with nothing hidden between them', () => {
		const gaps = computeDiffGaps([hunk(1, 3, 1, 3), hunk(4, 2, 4, 2)], 'modified');

		expect(gaps.map((gap) => gap.id)).toEqual(['gap-tail']);
	});

	it('gives added files no tail gap (the hunk already covers the file)', () => {
		const gaps = computeDiffGaps([hunk(0, 0, 1, 5)], 'added');

		expect(gaps).toEqual([]);
	});

	it('gives deleted files no gaps (no target side to read)', () => {
		expect(computeDiffGaps([hunk(1, 5, 0, 0)], 'deleted')).toEqual([]);
	});

	it('returns nothing for an empty hunk list', () => {
		expect(computeDiffGaps([], 'modified')).toEqual([]);
	});
});

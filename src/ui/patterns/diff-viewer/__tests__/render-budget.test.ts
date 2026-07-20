import { describe, expect, it } from 'vitest';
import { countDiffLines } from '../render-budget';
import type { DiffViewerLine } from '../types';

const line = (content: string): DiffViewerLine => ({
	kind: 'context',
	content,
	oldLineNo: 1,
	newLineNo: 1
});

describe('countDiffLines', () => {
	it('returns 0 for no hunks', () => {
		expect(countDiffLines([])).toBe(0);
	});

	it('sums the lines of every hunk', () => {
		expect(countDiffLines([{ lines: [line('a'), line('b')] }, { lines: [line('c')] }])).toBe(3);
	});

	it('adds expanded hidden-context lines when a gap map is given', () => {
		const expandedGaps = new Map<string, DiffViewerLine[]>([
			['gap-1', [line('x'), line('y')]],
			['gap-tail', []]
		]);

		expect(countDiffLines([{ lines: [line('a')] }], expandedGaps)).toBe(3);
	});
});

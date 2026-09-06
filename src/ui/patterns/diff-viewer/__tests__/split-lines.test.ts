import { describe, expect, it } from 'vitest';
import { pairLines } from '../split-lines';
import type { DiffViewerLine } from '../types';

const context = (n: number): DiffViewerLine => ({
	kind: 'context',
	content: `ctx ${n}`,
	oldLineNo: n,
	newLineNo: n
});
const removed = (n: number): DiffViewerLine => ({
	kind: 'removed',
	content: `old ${n}`,
	oldLineNo: n,
	newLineNo: null
});
const added = (n: number): DiffViewerLine => ({
	kind: 'added',
	content: `new ${n}`,
	oldLineNo: null,
	newLineNo: n
});

describe('pairLines', () => {
	it('returns no rows for no lines', () => {
		expect(pairLines([])).toEqual([]);
	});

	it('puts context lines on both sides of the same row', () => {
		const lines = [context(1), context(2)];
		const rows = pairLines(lines);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toEqual({
			left: lines[0],
			leftIndex: 0,
			right: lines[0],
			rightIndex: 0,
			primary: lines[0]
		});
		expect(rows[1]).toEqual({
			left: lines[1],
			leftIndex: 1,
			right: lines[1],
			rightIndex: 1,
			primary: lines[1]
		});
	});

	it('pairs a removed run with the added run that follows it, index-wise', () => {
		const lines = [removed(1), removed(2), added(1), added(2)];
		const rows = pairLines(lines);

		expect(rows).toHaveLength(2);
		expect(rows[0].left).toBe(lines[0]);
		expect(rows[0].right).toBe(lines[2]);
		expect(rows[1].left).toBe(lines[1]);
		expect(rows[1].right).toBe(lines[3]);
	});

	it('leaves the shorter side empty on uneven runs', () => {
		const rows = pairLines([removed(1), added(1), added(2)]);

		expect(rows).toHaveLength(2);
		expect(rows[1].left).toBeNull();
		expect(rows[1].leftIndex).toBeNull();
		expect(rows[1].right?.content).toBe('new 2');
	});

	it('handles a pure removal with no additions', () => {
		const rows = pairLines([context(1), removed(2)]);

		expect(rows).toHaveLength(2);
		expect(rows[1].left?.content).toBe('old 2');
		expect(rows[1].right).toBeNull();
	});

	it('handles additions that appear without a preceding removal', () => {
		const rows = pairLines([added(1), removed(2)]);

		// The added run forms its own block; the removal that follows starts a
		// new block on the next row.
		expect(rows).toHaveLength(2);
		expect(rows[0].left).toBeNull();
		expect(rows[0].right?.content).toBe('new 1');
		expect(rows[1].left?.content).toBe('old 2');
		expect(rows[1].right).toBeNull();
	});

	it('marks the new side as primary, falling back to the old side', () => {
		const rows = pairLines([removed(1), added(1), removed(2)]);

		expect(rows[0].primary.kind).toBe('added');
		expect(rows[1].primary.kind).toBe('removed');
	});

	it('keeps source indices pointing into the original array', () => {
		const lines = [context(1), removed(2), added(2)];
		const rows = pairLines(lines);

		expect(rows[1].leftIndex).toBe(1);
		expect(rows[1].rightIndex).toBe(2);
	});
});

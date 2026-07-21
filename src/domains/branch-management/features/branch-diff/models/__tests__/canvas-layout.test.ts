import { describe, expect, it } from 'vitest';
import {
	buildCanvasLayout,
	COLUMN_GAP,
	DIFF_AREA_HEIGHT,
	EXPANDED_NODE_WIDTH,
	NODE_SYMBOL_LIMIT,
	NODE_WIDTH,
	nodeHeight,
	type CanvasFile
} from '../canvas-layout';
import type { StructureEdge } from '$infrastructure/bindings';

const file = (path: string, symbolCount = 0): CanvasFile => ({ path, symbolCount });
const edge = (from: string, to: string): StructureEdge => ({ from, to, kind: 'import' });

function nodeOf(layout: ReturnType<typeof buildCanvasLayout>, path: string) {
	const node = layout.nodes.find((n) => n.path === path);
	if (!node) {
		throw new Error(`node ${path} missing`);
	}
	return node;
}

describe('nodeHeight', () => {
	it('grows with the symbol count up to the display limit', () => {
		expect(nodeHeight(0)).toBeLessThan(nodeHeight(1));
		expect(nodeHeight(1)).toBeLessThan(nodeHeight(NODE_SYMBOL_LIMIT));
		// Past the limit only the "+n more" row is added, then it stops growing.
		expect(nodeHeight(NODE_SYMBOL_LIMIT + 1)).toBe(nodeHeight(NODE_SYMBOL_LIMIT + 50));
	});

	it('reserves the fixed diff area for expanded nodes', () => {
		expect(nodeHeight(2, true)).toBe(nodeHeight(2) + DIFF_AREA_HEIGHT);
	});
});

describe('buildCanvasLayout', () => {
	it('places imported files one column left of their importers', () => {
		// c imports b, b imports a → columns a=0, b=1, c=2.
		const layout = buildCanvasLayout(
			[file('a.ts'), file('b.ts'), file('c.ts')],
			[edge('b.ts', 'a.ts'), edge('c.ts', 'b.ts')]
		);

		const [a, b, c] = ['a.ts', 'b.ts', 'c.ts'].map((p) => nodeOf(layout, p));
		expect(b.x - a.x).toBe(NODE_WIDTH + COLUMN_GAP);
		expect(c.x - b.x).toBe(NODE_WIDTH + COLUMN_GAP);
		expect(layout.width).toBeGreaterThan(c.x);
		expect(layout.height).toBeGreaterThan(0);
	});

	it('stacks same-column nodes vertically in path order', () => {
		// Both b and c import a — they share column 1.
		const layout = buildCanvasLayout(
			[file('a.ts'), file('b.ts'), file('c.ts')],
			[edge('b.ts', 'a.ts'), edge('c.ts', 'a.ts')]
		);

		const b = nodeOf(layout, 'b.ts');
		const c = nodeOf(layout, 'c.ts');
		expect(b.x).toBe(c.x);
		expect(b.y).toBeLessThan(c.y);
	});

	it('orders a column by the barycenter of its dependencies', () => {
		// a sits above z in column 0. In column 1, alphabetical order would
		// put b-uses-z first — but barycenter pulls each importer next to the
		// file it imports, so c-uses-a (importing the upper node) comes first.
		const layout = buildCanvasLayout(
			[file('a.ts'), file('z.ts'), file('b-uses-z.ts'), file('c-uses-a.ts')],
			[edge('b-uses-z.ts', 'z.ts'), edge('c-uses-a.ts', 'a.ts')]
		);

		expect(nodeOf(layout, 'a.ts').y).toBeLessThan(nodeOf(layout, 'z.ts').y);
		expect(nodeOf(layout, 'c-uses-a.ts').y).toBeLessThan(nodeOf(layout, 'b-uses-z.ts').y);
	});

	it('widens a column to fit its expanded nodes', () => {
		// a (column 0) is expanded — column 1 must start past the wide slot.
		const layout = buildCanvasLayout(
			[
				{ path: 'a.ts', symbolCount: 0, expanded: true },
				{ path: 'b.ts', symbolCount: 0 }
			],
			[edge('b.ts', 'a.ts')]
		);

		const a = nodeOf(layout, 'a.ts');
		const b = nodeOf(layout, 'b.ts');
		expect(a.width).toBe(EXPANDED_NODE_WIDTH);
		expect(a.height).toBe(nodeHeight(0, true));
		expect(b.x - a.x).toBe(EXPANDED_NODE_WIDTH + COLUMN_GAP);
		expect(layout.columns).toEqual([
			{ x: a.x, width: EXPANDED_NODE_WIDTH },
			{ x: b.x, width: NODE_WIDTH }
		]);
	});

	it('breaks cycles deterministically instead of looping', () => {
		const files = [file('a.ts'), file('b.ts')];
		const edges = [edge('a.ts', 'b.ts'), edge('b.ts', 'a.ts')];

		const first = buildCanvasLayout(files, edges);
		const second = buildCanvasLayout(files, edges);
		expect(first).toEqual(second);
		// The two nodes land in different columns (one dependency ignored).
		const a = nodeOf(first, 'a.ts');
		const b = nodeOf(first, 'b.ts');
		expect(a.x).not.toBe(b.x);
	});

	it('grids isolated files below the connected section', () => {
		const layout = buildCanvasLayout(
			[file('a.ts'), file('b.ts'), file('z1.css'), file('z2.css'), file('z3.css'), file('z4.css')],
			[edge('b.ts', 'a.ts')]
		);

		const dagBottom = Math.max(
			nodeOf(layout, 'a.ts').y + nodeOf(layout, 'a.ts').height,
			nodeOf(layout, 'b.ts').y + nodeOf(layout, 'b.ts').height
		);
		// All isolated nodes start below the DAG…
		for (const path of ['z1.css', 'z2.css', 'z3.css', 'z4.css']) {
			expect(nodeOf(layout, path).y).toBeGreaterThan(dagBottom);
		}
		// …and wrap into rows (grid has 3 columns, so z4 sits under z1).
		expect(nodeOf(layout, 'z4.css').x).toBe(nodeOf(layout, 'z1.css').x);
		expect(nodeOf(layout, 'z4.css').y).toBeGreaterThan(nodeOf(layout, 'z1.css').y);
	});

	it('handles an all-isolated changeset and empty input', () => {
		const layout = buildCanvasLayout([file('a.md'), file('b.md')], []);
		expect(layout.nodes).toHaveLength(2);
		expect(nodeOf(layout, 'a.md').x).toBeLessThan(nodeOf(layout, 'b.md').x);

		const empty = buildCanvasLayout([], []);
		expect(empty.nodes).toHaveLength(0);
	});

	it('ignores edges whose endpoints are filtered off the canvas', () => {
		const layout = buildCanvasLayout([file('a.ts')], [edge('a.ts', 'hidden.ts')]);
		// a.ts has no usable edges → it lands in the isolated grid at column 0.
		expect(layout.nodes).toHaveLength(1);
	});
});

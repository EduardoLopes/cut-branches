import { describe, expect, it } from 'vitest';
import { buildCanvasLayout, type CanvasLayout } from '../canvas-layout';
import { chamferedPath, routeEdges } from '../edge-routing';
import type { StructureEdge } from '$infrastructure/bindings';

const edge = (from: string, to: string): StructureEdge => ({ from, to, kind: 'import' });

function layoutFor(paths: string[], edges: StructureEdge[]): CanvasLayout {
	return buildCanvasLayout(
		paths.map((path) => ({ path, symbolCount: 1 })),
		edges
	);
}

describe('chamferedPath', () => {
	it('cuts interior corners with 45° chamfers', () => {
		const path = chamferedPath([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 }
		]);
		// The corner at (100, 0) becomes two points 16px along each segment.
		expect(path).toBe('M 0 0 L 84 0 L 100 16 L 100 100');
	});

	it('shrinks the chamfer to fit short segments', () => {
		const path = chamferedPath([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 100 }
		]);
		// The 10px incoming segment caps the cut at 5px.
		expect(path).toBe('M 0 0 L 5 0 L 10 5 L 10 100');
	});

	it('handles trivial inputs', () => {
		expect(chamferedPath([])).toBe('');
		expect(chamferedPath([{ x: 3, y: 4 }])).toBe('M 3 4');
		expect(
			chamferedPath([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 }
			])
		).toBe('M 0 0 L 10 0');
	});

	it('keeps zero-length corners as plain line segments', () => {
		const path = chamferedPath([
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 }
		]);
		expect(path).toContain('L 0 0');
	});
});

describe('routeEdges', () => {
	it('routes a forward edge right-to-left through the column channel', () => {
		const layout = layoutFor(['a.ts', 'b.ts'], [edge('b.ts', 'a.ts')]);
		const [routed] = routeEdges(layout, [edge('b.ts', 'a.ts')]).edges;

		expect(routed.from).toBe('b.ts');
		expect(routed.to).toBe('a.ts');
		expect(routed.path.startsWith('M ')).toBe(true);
		// Start x (importer's left edge) is greater than end x (imported
		// file's right edge) — the trace crosses the channel leftwards.
		const numbers = routed.path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
		const startX = numbers[0];
		const endX = numbers[numbers.length - 2];
		expect(startX).toBeGreaterThan(endX);
	});

	it('draws a straight line when ports align and a chamfered channel otherwise', () => {
		// Same column stacking: b and c both import a; the second incoming
		// port of a sits lower, so that edge needs the vertical channel run.
		const edges = [edge('b.ts', 'a.ts'), edge('c.ts', 'a.ts')];
		const layout = layoutFor(['a.ts', 'b.ts', 'c.ts'], edges);
		const routed = routeEdges(layout, edges).edges;

		expect(routed).toHaveLength(2);
		// The lower importer's trace bends: more than 2 path commands.
		const bends = routed.map((r) => (r.path.match(/L /g) ?? []).length);
		expect(Math.max(...bends)).toBeGreaterThan(1);
	});

	it('gives parallel runs in the same channel distinct lanes', () => {
		const edges = [edge('b.ts', 'a.ts'), edge('c.ts', 'a.ts')];
		const layout = layoutFor(['a.ts', 'b.ts', 'c.ts'], edges);
		const routed = routeEdges(layout, edges).edges;

		// Each trace's vertical run x — the second number of the second point.
		const laneOf = (path: string) => {
			const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
			return numbers[2];
		};
		const lanes = routed.map((r) => laneOf(r.path));
		expect(lanes[0]).not.toBe(lanes[1]);
	});

	it('routes multi-column edges through the corridor instead of crossing columns', () => {
		// c imports b imports a; c ALSO imports a directly (span 2).
		const edges = [edge('b.ts', 'a.ts'), edge('c.ts', 'b.ts'), edge('c.ts', 'a.ts')];
		const layout = layoutFor(['a.ts', 'b.ts', 'c.ts'], edges);
		const routed = routeEdges(layout, edges);

		const nodeBottom = Math.max(...layout.nodes.map((n) => n.y + n.height));
		const longEdge = routed.edges.find((r) => r.from === 'c.ts' && r.to === 'a.ts');
		const ys =
			longEdge?.path
				.match(/-?\d+(\.\d+)?/g)
				?.map(Number)
				.filter((_, i) => i % 2 === 1) ?? [];
		expect(Math.max(...ys)).toBeGreaterThan(nodeBottom);
		// The routed extents grow to cover the corridor.
		expect(routed.height).toBeGreaterThan(layout.height);
	});

	it('detours backward (cycle) edges below both nodes', () => {
		const edges = [edge('a.ts', 'b.ts'), edge('b.ts', 'a.ts')];
		const layout = layoutFor(['a.ts', 'b.ts'], edges);
		const routed = routeEdges(layout, edges).edges;

		expect(routed).toHaveLength(2);
		const bottoms = layout.nodes.map((n) => n.y + n.height);
		const lowest = Math.max(...bottoms);
		// One of the two traces dips below every node (the detour).
		const maxY = (path: string) => {
			const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
			return Math.max(...numbers.filter((_, i) => i % 2 === 1));
		};
		expect(Math.max(...routed.map((r) => maxY(r.path)))).toBeGreaterThan(lowest);
	});

	it('skips edges with endpoints missing from the layout', () => {
		const layout = layoutFor(['a.ts'], []);
		expect(routeEdges(layout, [edge('a.ts', 'ghost.ts')]).edges).toEqual([]);
	});

	it('is deterministic regardless of input edge order', () => {
		const edges = [edge('c.ts', 'a.ts'), edge('b.ts', 'a.ts')];
		const layout = layoutFor(['a.ts', 'b.ts', 'c.ts'], edges);

		const forward = routeEdges(layout, edges);
		const reversed = routeEdges(layout, [...edges].reverse());
		expect(forward).toEqual(reversed);
	});
});

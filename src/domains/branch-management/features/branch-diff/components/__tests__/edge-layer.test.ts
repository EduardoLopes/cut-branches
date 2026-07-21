import { describe, expect, it, vi } from 'vitest';
import { buildCanvasLayout } from '../../models/canvas-layout';
import EdgeLayer from '../edge-layer.svelte';
import type { StructureEdge } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const edges: StructureEdge[] = [
	{ from: 'b.ts', to: 'a.ts', kind: 'call', symbols: ['alpha', 'beta'] },
	{ from: 'c.ts', to: 'a.ts', kind: 'import', symbols: [] }
];
const layout = buildCanvasLayout(
	[
		{ path: 'a.ts', symbolCount: 0 },
		{ path: 'b.ts', symbolCount: 0 },
		{ path: 'c.ts', symbolCount: 0 }
	],
	edges
);

function highlightStates(container: Element): Map<string, boolean> {
	return new Map(
		[...container.querySelectorAll('[data-testid="diff-canvas-edge"]')].map((path) => [
			`${path.getAttribute('data-from')}->${path.getAttribute('data-to')}`,
			path.getAttribute('data-highlighted') === 'true'
		])
	);
}

describe('EdgeLayer', () => {
	it('renders one SVG trace per edge with direction arrowheads', async () => {
		const { container } = renderWithTestWrapper(EdgeLayer, { layout, edges });

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(2);
		});
		const paths = [...container.querySelectorAll('[data-testid="diff-canvas-edge"]')];
		// Real SVG elements (the snippet must compile in the SVG namespace).
		expect(paths.every((p) => p.namespaceURI === 'http://www.w3.org/2000/svg')).toBe(true);
		// Each head points at a colored lane marker (calls) or the muted one.
		expect(
			paths.every((p) =>
				/^url\(#edge-arrow-(lane-\d+|muted)\)$/.test(p.getAttribute('marker-end') ?? '')
			)
		).toBe(true);
	});

	it('highlights the hovered node’s edges on the IMPORTER side too', async () => {
		// Hovering b.ts must light b→a (edge.from === path) and leave c→a alone.
		const { container } = renderWithTestWrapper(EdgeLayer, {
			layout,
			edges,
			hoveredPath: 'b.ts'
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(2);
		});
		const states = highlightStates(container);
		expect(states.get('b.ts->a.ts')).toBe(true);
		expect(states.get('c.ts->a.ts')).toBe(false);
	});

	it('highlights both of the hovered imported file’s edges', async () => {
		const { container } = renderWithTestWrapper(EdgeLayer, {
			layout,
			edges,
			hoveredPath: 'a.ts'
		});

		await vi.waitFor(() => {
			const states = highlightStates(container);
			expect(states.get('b.ts->a.ts')).toBe(true);
			expect(states.get('c.ts->a.ts')).toBe(true);
		});
		// Both touch the hovered file, so none are dimmed.
		expect(container.querySelector('[data-dim="true"]')).toBeNull();
	});

	it('dims edges unrelated to the hovered node', async () => {
		// Hovering b.ts lifts b→a and pushes the unrelated c→a back.
		const { container } = renderWithTestWrapper(EdgeLayer, { layout, edges, hoveredPath: 'b.ts' });
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(2);
		});
		const call = container.querySelector('[data-testid="diff-canvas-edge"][data-from="b.ts"]');
		const other = container.querySelector('[data-testid="diff-canvas-edge"][data-from="c.ts"]');
		expect(call?.getAttribute('data-highlighted')).toBe('true');
		expect(call?.getAttribute('data-dim')).toBeNull();
		expect(other?.getAttribute('data-dim')).toBe('true');
	});

	it('colors call edges by lane and leaves import-only edges muted', async () => {
		const { container } = renderWithTestWrapper(EdgeLayer, { layout, edges });

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(2);
		});
		const call = container.querySelector('[data-testid="diff-canvas-edge"][data-from="b.ts"]');
		const importOnly = container.querySelector(
			'[data-testid="diff-canvas-edge"][data-from="c.ts"]'
		);
		expect(call?.getAttribute('data-kind')).toBe('call');
		// A call edge carries a lane index and a lane arrowhead.
		expect(call?.getAttribute('data-lane')).toMatch(/^\d+$/);
		expect(call?.getAttribute('marker-end')).toBe(
			`url(#edge-arrow-lane-${call?.getAttribute('data-lane')})`
		);
		// Import-only edges have no lane and use the muted marker.
		expect(importOnly?.getAttribute('data-kind')).toBe('import');
		expect(importOnly?.getAttribute('data-lane')).toBeNull();
		expect(importOnly?.getAttribute('marker-end')).toBe('url(#edge-arrow-muted)');
	});

	it('draws no symbol labels itself — those live in the on-top labels layer', async () => {
		const { container } = renderWithTestWrapper(EdgeLayer, { layout, edges, hoveredPath: 'a.ts' });
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(2);
		});
		expect(container.querySelector('[data-testid="diff-canvas-edge-label"]')).toBeNull();
	});
});

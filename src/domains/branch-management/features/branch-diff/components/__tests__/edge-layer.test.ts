import { describe, expect, it, vi } from 'vitest';
import { buildCanvasLayout } from '../../models/canvas-layout';
import EdgeLayer from '../edge-layer.svelte';
import type { StructureEdge } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const edges: StructureEdge[] = [
	{ from: 'b.ts', to: 'a.ts', kind: 'import' },
	{ from: 'c.ts', to: 'a.ts', kind: 'import' }
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
		expect(paths.every((p) => p.getAttribute('marker-end') === 'url(#edge-arrow)')).toBe(true);
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

	it('highlights on the imported side and switches the arrowhead', async () => {
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
		const highlighted = container.querySelector('[data-highlighted="true"]');
		expect(highlighted?.getAttribute('marker-end')).toBe('url(#edge-arrow-highlighted)');
	});
});

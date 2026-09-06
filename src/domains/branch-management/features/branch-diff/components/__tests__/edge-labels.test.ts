import { describe, expect, it, vi } from 'vitest';
import { buildCanvasLayout } from '../../models/canvas-layout';
import EdgeLabels from '../edge-labels.svelte';
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

describe('EdgeLabels', () => {
	it('shows nothing until a node is hovered', async () => {
		const { container } = await renderWithTestWrapper(EdgeLabels, { layout, edges });
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas-edge-labels"]')).not.toBeNull();
		});
		expect(container.querySelector('[data-testid="diff-canvas-edge-label"]')).toBeNull();
	});

	it('labels only the hovered node’s call edges, one symbol per line on a chip', async () => {
		const { container } = await renderWithTestWrapper(EdgeLabels, {
			layout,
			edges,
			hoveredPath: 'a.ts'
		});
		await vi.waitFor(() => {
			const labels = [...container.querySelectorAll('[data-testid="diff-canvas-edge-label"]')];
			expect(labels).toHaveLength(1);
			expect(labels[0].getAttribute('data-from')).toBe('b.ts');
			// Opaque backing chip.
			expect(labels[0].querySelector('rect')).not.toBeNull();
			// Header + one text line per symbol.
			const lines = [...labels[0].querySelectorAll('text')].map((t) => t.textContent?.trim());
			expect(lines).toEqual(['uses', 'alpha', 'beta']);
		});
	});

	it('stacks a long symbol list vertically with a summary line', async () => {
		const many: StructureEdge[] = [
			{
				from: 'b.ts',
				to: 'a.ts',
				kind: 'call',
				symbols: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
			}
		];
		const manyLayout = buildCanvasLayout(
			[
				{ path: 'a.ts', symbolCount: 0 },
				{ path: 'b.ts', symbolCount: 0 }
			],
			many
		);
		const { container } = await renderWithTestWrapper(EdgeLabels, {
			layout: manyLayout,
			edges: many,
			hoveredPath: 'a.ts'
		});
		await vi.waitFor(() => {
			const lines = [
				...container.querySelectorAll('[data-testid="diff-canvas-edge-label"] text')
			].map((t) => t.textContent?.trim());
			// header + 6 names + summary
			expect(lines).toHaveLength(8);
			expect(lines.at(-1)).toBe('+2 more');
		});
	});
});

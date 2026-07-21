import { describe, expect, it } from 'vitest';
import { edgeColorLane, edgeLaneColor, mutedEdgeColor, EDGE_PALETTE_SIZE } from '../edge-colors';

describe('edgeColorLane', () => {
	it('is stable for the same key and within the palette', () => {
		const lane = edgeColorLane('src/utils.ts');
		expect(lane).toBe(edgeColorLane('src/utils.ts'));
		expect(lane).toBeGreaterThanOrEqual(0);
		expect(lane).toBeLessThan(EDGE_PALETTE_SIZE);
	});

	it('handles the empty key', () => {
		expect(edgeColorLane('')).toBe(0);
	});

	it('spreads different keys across more than one lane', () => {
		const lanes = new Set(Array.from({ length: 30 }, (_, i) => edgeColorLane(`file-${i}.ts`)));
		expect(lanes.size).toBeGreaterThan(1);
	});
});

describe('edgeLaneColor', () => {
	it('returns a CSS var reference and wraps out-of-range lanes', () => {
		expect(edgeLaneColor(0)).toContain('var(');
		expect(edgeLaneColor(EDGE_PALETTE_SIZE)).toBe(edgeLaneColor(0));
		expect(edgeLaneColor(-1)).toBe(edgeLaneColor(EDGE_PALETTE_SIZE - 1));
	});
});

describe('mutedEdgeColor', () => {
	it('returns a CSS var reference', () => {
		expect(mutedEdgeColor()).toContain('var(');
	});
});

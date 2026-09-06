import { describe, expect, it } from 'vitest';
import { edgeLabelLines, edgeLabelWidth } from '../edge-label';

describe('edgeLabelLines', () => {
	it('is empty when there are no symbols', () => {
		expect(edgeLabelLines([])).toEqual([]);
	});

	it('puts a header first, then one line per symbol', () => {
		expect(edgeLabelLines(['alpha', 'beta'])).toEqual(['uses', 'alpha', 'beta']);
	});

	it('summarizes the remainder past the per-chip limit', () => {
		const lines = edgeLabelLines(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
		// header + 6 names + summary
		expect(lines).toHaveLength(8);
		expect(lines[0]).toBe('uses');
		expect(lines.at(-1)).toBe('+2 more');
	});

	it('ellipsizes a very long symbol name', () => {
		const [, name] = edgeLabelLines(['aVeryLongExportedSymbolNameThatKeepsGoing']);
		expect(name.endsWith('…')).toBe(true);
		expect(name.length).toBeLessThan('aVeryLongExportedSymbolNameThatKeepsGoing'.length);
	});
});

describe('edgeLabelWidth', () => {
	it('is zero without any symbols', () => {
		expect(edgeLabelWidth([])).toBe(0);
	});

	it('grows with the widest line', () => {
		expect(edgeLabelWidth(['reallyLongSymbolNameHere'])).toBeGreaterThan(edgeLabelWidth(['x']));
	});
});

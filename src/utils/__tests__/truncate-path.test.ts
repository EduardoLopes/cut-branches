import { describe, expect, test } from 'vitest';
import { ELLIPSIS, splitHighlight, truncatePath } from '../truncate-path';

// Monospace stand-in: every character is one unit wide.
const measure = (text: string) => text.length;

describe('truncatePath', () => {
	const path = '/Users/me/Projects/cut-branches';

	test('returns the path untouched when it fits', () => {
		expect(truncatePath(path, path.length, measure)).toBe(path);
		expect(truncatePath(path, 100, measure, { position: 'end' })).toBe(path);
	});

	test('end: keeps the head and trails an ellipsis', () => {
		expect(truncatePath(path, 10, measure, { position: 'end' })).toBe('/Users/me' + ELLIPSIS);
	});

	test('start: keeps the tail behind a leading ellipsis', () => {
		expect(truncatePath(path, 10, measure, { position: 'start' })).toBe(ELLIPSIS + '-branches');
	});

	test('middle: drops whole directories, keeping as many as fit', () => {
		// One directory short of the full path.
		expect(truncatePath(path, 24, measure)).toBe('/Users/me/' + ELLIPSIS + '/cut-branches');
		// Two short: the root folds into its first directory, so `/Users` is the
		// smallest anchor on offer.
		expect(truncatePath(path, 21, measure)).toBe('/Users/' + ELLIPSIS + '/cut-branches');
		// Down to just the ellipsis and the last segment.
		expect(truncatePath(path, 14, measure, { position: 'middle' })).toBe(
			ELLIPSIS + '/cut-branches'
		);
	});

	test('middle: maxSegments caps the directories shown even when more would fit', () => {
		// Four segments; the cap forces one out although the full path fits.
		expect(truncatePath(path, 100, measure, { maxSegments: 3 })).toBe(
			'/Users/' + ELLIPSIS + '/Projects/cut-branches'
		);
		// A cap at or above the segment count changes nothing.
		expect(truncatePath(path, 100, measure, { maxSegments: 4 })).toBe(path);
		// The cap does not apply to the other positions.
		expect(truncatePath(path, 100, measure, { position: 'end', maxSegments: 1 })).toBe(path);
		// Nor does it stop the fitter from going below the cap when it must.
		expect(truncatePath(path, 14, measure, { maxSegments: 3 })).toBe(ELLIPSIS + '/cut-branches');
	});

	test('middle: prefers trailing directories over leading ones at the same count', () => {
		// Keeping three segments: "aaaaaa/…/c/d" (12) and "aaaaaa/bb/…/d" (13)
		// overflow, "…/bb/c/d" (8) fits.
		expect(truncatePath('aaaaaa/bb/c/d', 8, measure)).toBe(ELLIPSIS + '/bb/c/d');
	});

	test('middle: splits characters evenly when the last segment alone is too wide', () => {
		expect(truncatePath(path, 9, measure)).toBe('/Use' + ELLIPSIS + 'ches');
	});

	test('middle: splits characters when there is no separator to lean on', () => {
		expect(truncatePath('averyveryverylongname', 8, measure)).toBe('aver' + ELLIPSIS + 'ame');
	});

	test('middle: a path that is only a root separator falls back to a character split', () => {
		expect(truncatePath('/abcdefgh', 5, measure)).toBe('/a' + ELLIPSIS + 'gh');
	});

	test('degenerates to a bare ellipsis when nothing else fits', () => {
		expect(truncatePath(path, 1, measure, { position: 'end' })).toBe(ELLIPSIS);
		expect(truncatePath(path, 1, measure, { position: 'start' })).toBe(ELLIPSIS);
		expect(truncatePath(path, 1, measure, { position: 'middle' })).toBe(ELLIPSIS);
	});
});

describe('splitHighlight', () => {
	const path = '/Users/me/Projects/cut-branches';

	test('returns one plain run without a highlight or when it is not in the path', () => {
		expect(splitHighlight(path, path, '')).toEqual([{ text: path, highlighted: false }]);
		expect(splitHighlight(path, path, 'nope')).toEqual([{ text: path, highlighted: false }]);
	});

	test('highlights a range in an untruncated path', () => {
		expect(splitHighlight(path, path, 'cut-branches')).toEqual([
			{ text: '/Users/me/Projects/', highlighted: false },
			{ text: 'cut-branches', highlighted: true }
		]);
	});

	test('maps the range onto the kept suffix after a middle truncation', () => {
		const displayed = truncatePath(path, 21, measure); // "/Users/…/cut-branches"
		expect(splitHighlight(path, displayed, 'cut-branches')).toEqual([
			{ text: '/Users/…/', highlighted: false },
			{ text: 'cut-branches', highlighted: true }
		]);
	});

	test('keeps a highlight that sits entirely in the kept prefix', () => {
		const displayed = truncatePath(path, 10, measure, { position: 'end' }); // "/Users/me…"
		expect(splitHighlight(path, displayed, 'Users')).toEqual([
			{ text: '/', highlighted: false },
			{ text: 'Users', highlighted: true },
			{ text: '/me…', highlighted: false }
		]);
	});

	test('highlights the ellipsis when the range spans the removed characters', () => {
		const displayed = truncatePath(path, 9, measure); // "/Use…ches"
		expect(splitHighlight(path, displayed, 'sers/me/Projects/cut-bran')).toEqual([
			{ text: '/U', highlighted: false },
			{ text: 'se…', highlighted: true },
			{ text: 'ches', highlighted: false }
		]);
	});

	test('does not highlight the ellipsis when the range ends before the gap', () => {
		const displayed = truncatePath(path, 9, measure); // "/Use…ches"
		expect(splitHighlight(path, displayed, '/Users')).toEqual([
			{ text: '/Use', highlighted: true },
			{ text: '…ches', highlighted: false }
		]);
	});
});

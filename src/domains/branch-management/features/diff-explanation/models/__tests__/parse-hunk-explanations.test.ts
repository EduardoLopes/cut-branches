import { describe, expect, it } from 'vitest';
import { parseHunkExplanations } from '../parse-hunk-explanations';

describe('parseHunkExplanations', () => {
	it('returns nothing before the first marker arrives', () => {
		expect(parseHunkExplanations('')).toEqual([]);
		expect(parseHunkExplanations('some preamble with no marker yet')).toEqual([]);
	});

	it('splits marker-delimited sections in order', () => {
		const raw = '@@HUNK 1@@\nRenames the helper.\n@@HUNK 2@@\nAdds a guard clause.';
		expect(parseHunkExplanations(raw)).toEqual([
			{ index: 1, text: 'Renames the helper.' },
			{ index: 2, text: 'Adds a guard clause.' }
		]);
	});

	it('ignores any preamble before the first marker', () => {
		const raw = 'Here goes:\n@@HUNK 1@@\nDoes a thing.';
		expect(parseHunkExplanations(raw)).toEqual([{ index: 1, text: 'Does a thing.' }]);
	});

	it('keeps a trailing section open while it is still streaming', () => {
		const raw = '@@HUNK 1@@\nFull.\n@@HUNK 2@@\npartial so fa';
		expect(parseHunkExplanations(raw)).toEqual([
			{ index: 1, text: 'Full.' },
			{ index: 2, text: 'partial so fa' }
		]);
	});

	it('does not confuse git hunk headers for markers', () => {
		const raw = '@@HUNK 1@@\nTouches the range @@ -1,4 +1,6 @@ inside prose.';
		expect(parseHunkExplanations(raw)).toEqual([
			{ index: 1, text: 'Touches the range @@ -1,4 +1,6 @@ inside prose.' }
		]);
	});
});

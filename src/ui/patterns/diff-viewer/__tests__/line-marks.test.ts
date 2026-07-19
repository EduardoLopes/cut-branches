import type { ThemedToken } from 'shiki';
import { describe, expect, it } from 'vitest';
import { buildMarkedRuns, findMatchRanges } from '../line-marks';

const token = (content: string, color?: string): ThemedToken =>
	({ content, color, offset: 0 }) as ThemedToken;

describe('findMatchRanges', () => {
	it('finds every case-insensitive occurrence', () => {
		expect(findMatchRanges('Foo foo FOO', 'foo')).toEqual([
			[0, 3],
			[4, 7],
			[8, 11]
		]);
	});

	it('returns nothing for an empty or whitespace-only term', () => {
		expect(findMatchRanges('anything', '')).toEqual([]);
		expect(findMatchRanges('anything', '   ')).toEqual([]);
	});

	it('returns nothing when the term is absent', () => {
		expect(findMatchRanges('abc', 'xyz')).toEqual([]);
	});
});

describe('buildMarkedRuns', () => {
	it('returns one unmarked run for plain text without a term', () => {
		expect(buildMarkedRuns('const x = 1', null, '')).toEqual([
			{ content: 'const x = 1', style: undefined, marked: false }
		]);
	});

	it('splits plain text around the match', () => {
		expect(buildMarkedRuns('const needle = 1', null, 'needle')).toEqual([
			{ content: 'const ', style: undefined, marked: false },
			{ content: 'needle', style: undefined, marked: true },
			{ content: ' = 1', style: undefined, marked: false }
		]);
	});

	it('keeps token styles while splitting inside a token', () => {
		const runs = buildMarkedRuns(
			'const needleValue',
			[token('const ', '#111'), token('needleValue', '#222')],
			'needle'
		);

		expect(runs).toEqual([
			{ content: 'const ', style: 'color:#111', marked: false },
			{ content: 'needle', style: 'color:#222', marked: true },
			{ content: 'Value', style: 'color:#222', marked: false }
		]);
	});

	it('marks matches that span multiple tokens', () => {
		const runs = buildMarkedRuns(
			'my needle',
			[token('my nee', '#111'), token('dle', '#222')],
			'needle'
		);

		expect(runs).toEqual([
			{ content: 'my ', style: 'color:#111', marked: false },
			{ content: 'nee', style: 'color:#111', marked: true },
			{ content: 'dle', style: 'color:#222', marked: true }
		]);
	});

	it('drops nothing when the whole line is a match', () => {
		expect(buildMarkedRuns('needle', null, 'needle')).toEqual([
			{ content: 'needle', style: undefined, marked: true }
		]);
	});

	it('returns no runs for an empty line', () => {
		expect(buildMarkedRuns('', null, 'needle')).toEqual([]);
	});
});

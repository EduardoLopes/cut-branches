import { describe, expect, it } from 'vitest';
import { formatCount } from '../format-count';

describe('formatCount', () => {
	it('returns an empty string for zero, negative, and non-finite input', () => {
		expect(formatCount(0)).toBe('');
		expect(formatCount(-3)).toBe('');
		expect(formatCount(Number.NaN)).toBe('');
		expect(formatCount(Number.POSITIVE_INFINITY)).toBe('');
	});

	it('renders counts up to the default max verbatim', () => {
		expect(formatCount(1)).toBe('1');
		expect(formatCount(42)).toBe('42');
		expect(formatCount(99)).toBe('99');
	});

	it('clamps anything above the default max to "<max>+"', () => {
		expect(formatCount(100)).toBe('99+');
		expect(formatCount(221)).toBe('99+');
		expect(formatCount(10_000)).toBe('99+');
	});

	it('honours a custom max', () => {
		expect(formatCount(9, { max: 9 })).toBe('9');
		expect(formatCount(10, { max: 9 })).toBe('9+');
		expect(formatCount(999, { max: 999 })).toBe('999');
		expect(formatCount(1000, { max: 999 })).toBe('999+');
	});

	it('honours a custom overflow label', () => {
		// The repository rail's config: three digits verbatim, and an overflow
		// label that stays at three glyphs so the pill never widens.
		expect(formatCount(999, { max: 999, overflow: '99+' })).toBe('999');
		expect(formatCount(1000, { max: 999, overflow: '99+' })).toBe('99+');
		expect(formatCount(50_000, { max: 999, overflow: '99+' })).toBe('99+');
	});

	it('floors fractional counts', () => {
		expect(formatCount(4.7)).toBe('4');
		expect(formatCount(99.9)).toBe('99');
		expect(formatCount(0.4)).toBe('');
	});
});

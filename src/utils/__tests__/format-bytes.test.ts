import { describe, expect, it } from 'vitest';
import { formatBytes } from '../format-bytes';

describe('formatBytes', () => {
	it('returns "0 B" for zero, negative, and non-finite input', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(-100)).toBe('0 B');
		expect(formatBytes(Number.NaN)).toBe('0 B');
		expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
	});

	it('formats whole bytes without decimals', () => {
		expect(formatBytes(1)).toBe('1 B');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(1023)).toBe('1023 B');
	});

	it('scales into KB, MB, GB, TB', () => {
		expect(formatBytes(1024)).toBe('1 KB');
		expect(formatBytes(1536)).toBe('1.5 KB');
		expect(formatBytes(1024 * 1024)).toBe('1 MB');
		expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
		expect(formatBytes(1024 ** 4)).toBe('1 TB');
	});

	it('trims trailing zeros and respects fractionDigits', () => {
		expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
		expect(formatBytes(1024 * 1.25)).toBe('1.3 KB');
		expect(formatBytes(1024 * 1.25, 2)).toBe('1.25 KB');
	});

	it('caps at the largest unit', () => {
		expect(formatBytes(1024 ** 6)).toContain('PB');
		// Beyond the unit table, values stay in PB rather than overflowing.
		expect(formatBytes(1024 ** 7)).toContain('PB');
	});
});

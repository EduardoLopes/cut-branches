import type { ThemedToken } from 'shiki';
import { describe, expect, it } from 'vitest';
import { tokenStyle } from '../token-style';

const token = (overrides: Partial<ThemedToken>): ThemedToken =>
	({ content: 'x', offset: 0, ...overrides }) as ThemedToken;

describe('tokenStyle', () => {
	it('passes a string htmlStyle through unchanged', () => {
		expect(tokenStyle(token({ htmlStyle: 'color:light-dark(#111, #eee)' } as never))).toBe(
			'color:light-dark(#111, #eee)'
		);
	});

	it('serializes an htmlStyle property map', () => {
		expect(
			tokenStyle(token({ htmlStyle: { color: '#111', 'font-style': 'italic' } } as never))
		).toBe('color:#111;font-style:italic');
	});

	it('falls back to the plain token color', () => {
		expect(tokenStyle(token({ color: '#abc123' }))).toBe('color:#abc123');
	});

	it('returns undefined when the token carries no styling', () => {
		expect(tokenStyle(token({}))).toBeUndefined();
	});
});

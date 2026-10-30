import { describe, expect, test } from 'vitest';
import BrandMark from '../brand-mark.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('BrandMark', () => {
	test('draws the mark in the text colour, decorative and 1em by default', async () => {
		const screen = await renderWithTestWrapper(BrandMark, { 'data-testid': 'mark' });

		const svg = screen.getByTestId('mark').element();
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.getAttribute('width')).toBe('1em');
		expect(svg.getAttribute('height')).toBe('1em');
		expect(svg.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
	});

	test('takes a width and height', async () => {
		const screen = await renderWithTestWrapper(BrandMark, {
			width: '16px',
			height: '16px',
			'data-testid': 'mark'
		});

		const svg = screen.getByTestId('mark').element();
		expect(svg.getAttribute('width')).toBe('16px');
		expect(svg.getAttribute('height')).toBe('16px');
	});
});

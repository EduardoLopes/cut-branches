import LucideTrash2 from '@lucide/svelte/icons/trash-2';
import { describe, expect, test } from 'vitest';
import Icon from '../icon.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('Icon', () => {
	test('renders the glyph inline, sized to its text by default', async () => {
		const screen = await renderWithTestWrapper(Icon, {
			icon: LucideTrash2,
			'data-testid': 'icon'
		});

		const svg = screen.getByTestId('icon').element();
		expect(svg.tagName.toLowerCase()).toBe('svg');
		expect(svg.getAttribute('width')).toBe('1em');
		expect(svg.getAttribute('height')).toBe('1em');
		// Its paths ship in the bundle: nothing to wait for.
		expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
	});

	test('takes an explicit size, or width and height', async () => {
		const sized = await renderWithTestWrapper(Icon, {
			icon: LucideTrash2,
			size: 20,
			'data-testid': 'sized'
		});
		expect(sized.getByTestId('sized').element().getAttribute('width')).toBe('20');

		const boxed = await renderWithTestWrapper(Icon, {
			icon: LucideTrash2,
			width: '14px',
			height: '12px',
			'data-testid': 'boxed'
		});
		const svg = boxed.getByTestId('boxed').element();
		expect(svg.getAttribute('width')).toBe('14px');
		expect(svg.getAttribute('height')).toBe('12px');
	});
});

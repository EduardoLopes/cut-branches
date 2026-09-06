import { createRawSnippet } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import ScrollWell from '../scroll-well.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';
import { css } from '@pindoba/styled-system/css';

function rows(count: number, height = 40) {
	return createRawSnippet(() => ({
		render: () =>
			`<div>${Array.from({ length: count }, (_, i) => `<div style="height:${height}px">row ${i}</div>`).join('')}</div>`
	}));
}

describe('ScrollWell', () => {
	test('renders its children in the scroller with default ids', () => {
		const screen = renderWithTestWrapper(ScrollWell, { children: rows(3) });

		expect(screen.getByTestId('scroll-well')).toHaveTextContent('row 0');
		expect(screen.getByTestId('scroll-well-shadow-top')).toBeInTheDocument();
		expect(screen.getByTestId('scroll-well-shadow-bottom')).toBeInTheDocument();
	});

	test('applies the sizing, scroller and test-id overrides', () => {
		const screen = renderWithTestWrapper(ScrollWell, {
			children: rows(1),
			class: css({ maxHeight: '100px' }),
			scrollerClass: css({ gap: 'lg' }),
			testId: 'list'
		});

		const scroller = screen.getByTestId('list').element() as HTMLElement;
		expect(getComputedStyle(scroller.parentElement as HTMLElement).maxHeight).toBe('100px');
		expect(getComputedStyle(scroller).gap).not.toBe('0px');
		expect(screen.getByTestId('list-shadow-top')).toBeInTheDocument();
	});

	test('flags the edge with more content and flips it after scrolling', async () => {
		const screen = renderWithTestWrapper(ScrollWell, {
			children: rows(40),
			class: css({ maxHeight: '160px' }),
			testId: 'list'
		});
		const scroller = screen.getByTestId('list').element() as HTMLElement;

		await vi.waitFor(() => expect(scroller.hasAttribute('data-overflow-bottom')).toBe(true));
		expect(scroller.hasAttribute('data-overflow-top')).toBe(false);

		scroller.scrollTop = scroller.scrollHeight;
		await vi.waitFor(() => expect(scroller.hasAttribute('data-overflow-top')).toBe(true));
		expect(scroller.hasAttribute('data-overflow-bottom')).toBe(false);
	});

	test('does not flag either edge when everything fits', async () => {
		const screen = renderWithTestWrapper(ScrollWell, {
			children: rows(2),
			class: css({ maxHeight: '400px' }),
			testId: 'list'
		});
		const scroller = screen.getByTestId('list').element() as HTMLElement;

		await vi.waitFor(() => expect(scroller.hasAttribute('data-overflow-bottom')).toBe(false));
		expect(scroller.hasAttribute('data-overflow-top')).toBe(false);
	});
});

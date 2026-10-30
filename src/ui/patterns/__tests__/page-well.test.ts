import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageWell from '../page-well.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="well-body">body</div>'
}));

const toolbar = createRawSnippet(() => ({
	render: () => '<div data-testid="well-toolbar">toolbar</div>'
}));

const footer = createRawSnippet(() => ({
	render: () => '<div data-testid="well-footer">footer</div>'
}));

const overlay = createRawSnippet(() => ({
	render: () => '<div data-testid="well-overlay">overlay</div>'
}));

/** The overlay's positioned ancestor, which also publishes the clearance. */
function overlayHost(screen: Awaited<ReturnType<typeof renderWithTestWrapper>>) {
	return screen.getByTestId('well-body').element().closest('[style]') as HTMLElement;
}

describe('PageWell', () => {
	it('renders only its children when no toolbar or footer is given', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="well-toolbar"]')).toBeNull();
		expect(screen.container.querySelector('[data-testid="well-footer"]')).toBeNull();
	});

	it('renders the toolbar and footer slots when provided', async () => {
		const screen = await renderWithTestWrapper(PageWell, {
			children,
			toolbar,
			footer,
			testId: 'branches-well'
		});

		expect(screen.getByTestId('well-toolbar')).toBeInTheDocument();
		expect(screen.getByTestId('well-footer')).toBeInTheDocument();
		expect(screen.getByTestId('branches-well')).toBeInTheDocument();
	});

	it('still renders its children while loading', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children, isLoading: true });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
	});

	it('renders unpadded content when padded is false', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children, padded: false });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
	});

	it('floats the overlay over a positioned content region and clears padded content', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children, footer, overlay });

		const host = overlayHost(screen);
		expect(screen.getByTestId('well-overlay').element().parentElement).toBe(host);
		expect(getComputedStyle(host).position).toBe('relative');
		expect(host.style.getPropertyValue('--page-well-overlay-clearance')).toBe('80px');
		// The footer stays outside the overlay's positioned region.
		expect(host.contains(screen.getByTestId('well-footer').element())).toBe(false);

		const scroller = screen.getByTestId('well-body').element().parentElement as HTMLElement;
		const base = parseFloat(getComputedStyle(scroller).paddingTop);
		expect(parseFloat(getComputedStyle(scroller).paddingBottom)).toBe(base + 80);
	});

	it('publishes no clearance without an overlay', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children });

		expect(overlayHost(screen).style.getPropertyValue('--page-well-overlay-clearance')).toBe('0px');
	});

	it('leaves unpadded content to add the clearance itself', async () => {
		const screen = await renderWithTestWrapper(PageWell, { children, overlay, padded: false });

		const scroller = screen.getByTestId('well-body').element().parentElement as HTMLElement;
		expect(parseFloat(getComputedStyle(scroller).paddingBottom)).toBe(0);
	});
});

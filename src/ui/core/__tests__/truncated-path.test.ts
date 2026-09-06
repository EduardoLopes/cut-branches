import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TruncatedPath from '../truncated-path.svelte';
// Rendered without the TestWrapper (no QueryClient needed), so pull in the
// Panda stylesheet ourselves: the component's `display: block` is what gives
// the ResizeObserver a width to measure.
import '../../../styles/app.css';

const path = '/Users/me/Projects/some/deeply/nested/folder/cut-branches';

// The component sizes itself to its parent, so each test controls the width
// by rendering into a fixed-width host.
async function renderAt(
	width: number,
	props: {
		path: string;
		truncate?: 'start' | 'middle' | 'end';
		highlight?: string;
		align?: 'start' | 'end';
	}
) {
	const host = document.createElement('div');
	host.style.width = `${width}px`;
	host.style.fontFamily = 'monospace';
	host.style.fontSize = '10px';
	document.body.appendChild(host);
	const screen = await render(TruncatedPath, { target: host, props });
	return { host, el: screen.getByTestId('truncated-path') };
}

describe('TruncatedPath', () => {
	test('renders the full path when it fits', async () => {
		const { el } = await renderAt(800, { path });

		await vi.waitFor(() => expect(el).toHaveTextContent(path));
		expect(el.element().getAttribute('title')).toBe(path);
	});

	test('keeps the last segment when truncating in the middle', async () => {
		const { el } = await renderAt(200, { path });

		await vi.waitFor(() => expect(el.element().textContent).toMatch(/…\/.*cut-branches$/));
		expect(el.element().textContent).not.toBe(path);
		expect(el.element().scrollWidth).toBeLessThanOrEqual(el.element().clientWidth);
	});

	test('honours the start and end positions', async () => {
		const start = await renderAt(120, { path, truncate: 'start' });
		await vi.waitFor(() => expect(start.el.element().textContent).toMatch(/^…/));

		const end = await renderAt(120, { path, truncate: 'end' });
		await vi.waitFor(() => expect(end.el.element().textContent).toMatch(/…$/));
	});

	test('re-fits when the container resizes', async () => {
		const { host, el } = await renderAt(120, { path });
		await vi.waitFor(() => expect(el.element().textContent).toContain('…'));

		host.style.width = '800px';
		await vi.waitFor(() => expect(el).toHaveTextContent(path));
	});
});

describe('TruncatedPath highlight', () => {
	test('emphasises the highlighted section and mutes the rest', async () => {
		const { el } = await renderAt(200, { path, highlight: 'cut-branches' });
		await vi.waitFor(() => expect(el.element().textContent).toMatch(/…\/.*cut-branches$/));

		const highlighted = el.element().querySelectorAll('[data-highlighted]');
		expect(highlighted).toHaveLength(1);
		expect(highlighted[0].textContent).toBe('cut-branches');
		// Every run is rendered, in order, so the visible text is unchanged.
		expect(el.element().textContent).toBe(
			[...el.element().children].map((child) => child.textContent).join('')
		);
	});

	test('renders plain text when the highlight is not in the path', async () => {
		const { el } = await renderAt(800, { path, highlight: 'nope' });
		await vi.waitFor(() => expect(el).toHaveTextContent(path));
		expect(el.element().querySelectorAll('[data-highlighted]')).toHaveLength(0);
	});

	test('aligns to the end when asked', async () => {
		const { el } = await renderAt(800, { path, align: 'end' });
		await vi.waitFor(() => expect(el).toHaveTextContent(path));
		expect(getComputedStyle(el.element()).textAlign).toBe('right');
	});
});

import { describe, it, expect, vi } from 'vitest';
import { scrollShadow } from '../scroll-shadow';

/** A real scrollable box: 50px viewport around 500px of content. */
function makeScroller() {
	const node = document.createElement('div');
	node.style.height = '50px';
	node.style.overflowY = 'auto';
	const content = document.createElement('div');
	content.style.height = '500px';
	node.appendChild(content);
	document.body.appendChild(node);
	return node;
}

describe('scrollShadow', () => {
	it('flags only bottom overflow at the top of the range', () => {
		const node = makeScroller();
		const action = scrollShadow(node);

		expect(node.hasAttribute('data-overflow-top')).toBe(false);
		expect(node.hasAttribute('data-overflow-bottom')).toBe(true);

		action?.destroy?.();
		node.remove();
	});

	it('flags only top overflow at the bottom of the range', () => {
		const node = makeScroller();
		const action = scrollShadow(node);

		node.scrollTop = node.scrollHeight - node.clientHeight;
		node.dispatchEvent(new Event('scroll'));

		expect(node.hasAttribute('data-overflow-top')).toBe(true);
		expect(node.hasAttribute('data-overflow-bottom')).toBe(false);

		action?.destroy?.();
		node.remove();
	});

	it('flags both directions in the middle of the range', () => {
		const node = makeScroller();
		const action = scrollShadow(node);

		node.scrollTop = 200;
		node.dispatchEvent(new Event('scroll'));

		expect(node.hasAttribute('data-overflow-top')).toBe(true);
		expect(node.hasAttribute('data-overflow-bottom')).toBe(true);

		action?.destroy?.();
		node.remove();
	});

	it('re-evaluates when a descendant resizes through its inline style', async () => {
		const node = makeScroller();
		const content = node.firstElementChild as HTMLElement;
		content.style.height = '20px';
		const action = scrollShadow(node);
		expect(node.hasAttribute('data-overflow-bottom')).toBe(false);

		// Only the spacer's style changes — no nodes added, no viewport resize.
		content.style.height = '500px';
		await vi.waitFor(() => expect(node.hasAttribute('data-overflow-bottom')).toBe(true));

		action?.destroy?.();
		node.remove();
	});

	it('stops reacting to scroll once destroyed', () => {
		const node = makeScroller();
		const action = scrollShadow(node);

		action?.destroy?.();
		node.scrollTop = node.scrollHeight - node.clientHeight;
		node.dispatchEvent(new Event('scroll'));

		// The teardown removed the listener, so the initial top-of-range state
		// (no top shadow) is unchanged.
		expect(node.hasAttribute('data-overflow-top')).toBe(false);

		node.remove();
	});
});

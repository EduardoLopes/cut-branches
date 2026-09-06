import { describe, expect, it } from 'vitest';
import { routeVerticalWheel } from '../route-vertical-wheel';

interface Setup {
	scroller: HTMLElement;
	node: HTMLElement;
	destroy: () => void;
	cleanup: () => void;
}

/** A vertically scrolling list containing a horizontal-only diff scroller,
 *  mirroring the branch-diff view's structure. */
function setup({ wideContent = true }: { wideContent?: boolean } = {}): Setup {
	const scroller = document.createElement('div');
	scroller.style.cssText = 'height: 100px; overflow-y: auto;';

	const node = document.createElement('div');
	node.style.cssText = 'overflow-x: auto; overflow-y: hidden;';

	const content = document.createElement('div');
	content.style.cssText = wideContent
		? 'width: 5000px; height: 400px;'
		: 'width: 10px; height: 400px;';
	node.appendChild(content);
	scroller.appendChild(node);
	document.body.appendChild(scroller);

	const action = routeVerticalWheel(node);
	return {
		scroller,
		node,
		destroy: () => action?.destroy?.(),
		cleanup: () => scroller.remove()
	};
}

function wheel(node: HTMLElement, init: WheelEventInit & { deltaMode?: number } = {}): WheelEvent {
	const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
	node.dispatchEvent(event);
	return event;
}

/** Routed deltas flush once per animation frame — wait one out. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('routeVerticalWheel', () => {
	it('routes vertical deltas to the nearest vertical scroller and consumes the event', async () => {
		const { scroller, node, cleanup } = setup();
		const event = wheel(node, { deltaY: 40 });

		expect(event.defaultPrevented).toBe(true);
		await nextFrame();
		expect(scroller.scrollTop).toBe(40);
		cleanup();
	});

	it('routes even without horizontal overflow — the latch does not need it', async () => {
		const { scroller, node, cleanup } = setup({ wideContent: false });
		const event = wheel(node, { deltaY: 40 });

		expect(event.defaultPrevented).toBe(true);
		await nextFrame();
		expect(scroller.scrollTop).toBe(40);
		cleanup();
	});

	it('coalesces same-frame deltas into one scroll write', async () => {
		const { scroller, node, cleanup } = setup();
		wheel(node, { deltaY: 40 });
		wheel(node, { deltaY: 10 });

		expect(scroller.scrollTop).toBe(0);
		await nextFrame();
		expect(scroller.scrollTop).toBe(50);

		wheel(node, { deltaY: 25 });
		await nextFrame();
		expect(scroller.scrollTop).toBe(75);
		cleanup();
	});

	it('converts line- and page-mode deltas to pixels', async () => {
		const { scroller, node, cleanup } = setup();
		wheel(node, { deltaY: 2, deltaMode: WheelEvent.DOM_DELTA_LINE });
		await nextFrame();
		expect(scroller.scrollTop).toBe(32);

		wheel(node, { deltaY: 1, deltaMode: WheelEvent.DOM_DELTA_PAGE });
		await nextFrame();
		expect(scroller.scrollTop).toBe(32 + scroller.clientHeight);
		cleanup();
	});

	it('leaves horizontal-dominant gestures to the scroller itself', async () => {
		const { scroller, node, cleanup } = setup();
		const event = wheel(node, { deltaX: 40, deltaY: 10 });

		expect(event.defaultPrevented).toBe(false);
		await nextFrame();
		expect(scroller.scrollTop).toBe(0);
		cleanup();
	});

	it('leaves pinch-zoom (ctrl) and shift-scroll gestures native', async () => {
		const { scroller, node, cleanup } = setup();

		expect(wheel(node, { deltaY: 40, ctrlKey: true }).defaultPrevented).toBe(false);
		expect(wheel(node, { deltaY: 40, shiftKey: true }).defaultPrevented).toBe(false);
		await nextFrame();
		expect(scroller.scrollTop).toBe(0);
		cleanup();
	});

	it('skips non-cancelable events — a native scroll is already driving those', async () => {
		const { scroller, node, cleanup } = setup();
		wheel(node, { deltaY: 40, cancelable: false });

		await nextFrame();
		expect(scroller.scrollTop).toBe(0);
		cleanup();
	});

	it('does nothing when no vertical scroller encloses the node', async () => {
		const node = document.createElement('div');
		const content = document.createElement('div');
		content.style.cssText = 'width: 5000px; height: 50px;';
		node.style.cssText = 'width: 100px; overflow-x: auto; overflow-y: hidden;';
		node.appendChild(content);
		document.body.appendChild(node);
		document.documentElement.style.overflowY = 'hidden';
		const action = routeVerticalWheel(node);

		const event = wheel(node, { deltaY: 40 });
		expect(event.defaultPrevented).toBe(false);

		action?.destroy?.();
		node.remove();
		document.documentElement.style.overflowY = '';
	});

	it('skips ancestors that overflow without being scrollable', async () => {
		// A clipping (overflow hidden) wrapper between the node and the real
		// scroller must not receive the delta.
		const { scroller, node, cleanup } = setup();
		const clipper = document.createElement('div');
		clipper.style.cssText = 'height: 150px; overflow-y: hidden;';
		scroller.replaceChild(clipper, node);
		clipper.appendChild(node);

		wheel(node, { deltaY: 40 });
		await nextFrame();
		expect(clipper.scrollTop).toBe(0);
		expect(scroller.scrollTop).toBe(40);
		cleanup();
	});

	it('stops listening and cancels the pending flush once destroyed', async () => {
		const { scroller, node, destroy, cleanup } = setup();
		wheel(node, { deltaY: 40 });
		destroy();
		const event = wheel(node, { deltaY: 10 });

		expect(event.defaultPrevented).toBe(false);
		await nextFrame();
		// Neither the queued delta nor the post-destroy event lands.
		expect(scroller.scrollTop).toBe(0);
		cleanup();
	});
});

import type { Action } from 'svelte/action';

/**
 * Routes dominantly-vertical wheel gestures around a horizontal-only scroller.
 *
 * WebKit (the Tauri webview on macOS) latches a wheel gesture to the
 * scrollable element under the pointer. When that element is the diff's
 * horizontal scroller — scrollable only sideways — vertical deltas are
 * swallowed instead of chaining to the page/list scroller, so the view stops
 * scrolling whenever the pointer is over a diff. The latch does not require
 * actual horizontal overflow: small diffs whose lines fit are trapped too.
 * This action re-routes those deltas by hand: a cancelable wheel event that
 * is mostly vertical is applied directly to the nearest vertically
 * scrollable ancestor.
 *
 * Two details keep the routed scrolling native-feeling:
 *
 * - Non-cancelable wheel events are ignored. WebKit marks events
 *   non-cancelable once a native scroll is already driving the gesture
 *   (e.g. it started outside the diff and latched onto the list) — routing
 *   those too would apply the delta twice and "double-scroll".
 * - Deltas are coalesced and written once per animation frame. Fast trackpad
 *   gestures fire several wheel events per frame, and a scrollTop write per
 *   event forces synchronous work that a many-thousand-row diff can't
 *   absorb — the stutter shows up exactly on fast flicks.
 *
 * Gestures the scroller should own stay fully native: horizontal-dominant
 * deltas, shift-modified scrolls (horizontal intent) and ctrl-modified ones
 * (pinch-zoom).
 */
export const routeVerticalWheel: Action<HTMLElement> = (node) => {
	let target: HTMLElement | null = null;
	let pending = 0;
	let frame = 0;

	function flush() {
		frame = 0;
		if (target) {
			target.scrollTop += pending;
		}
		pending = 0;
	}

	function onWheel(event: WheelEvent) {
		if (event.ctrlKey || event.shiftKey) {
			return;
		}
		if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
			return;
		}
		if (!event.cancelable) {
			return;
		}
		const scroller = findVerticalScroller(node.parentElement);
		if (!scroller) {
			return;
		}
		event.preventDefault();
		target = scroller;
		pending += normalizeDeltaY(event, scroller);
		if (!frame) {
			frame = requestAnimationFrame(flush);
		}
	}

	node.addEventListener('wheel', onWheel, { passive: false });
	return {
		destroy() {
			node.removeEventListener('wheel', onWheel);
			cancelAnimationFrame(frame);
		}
	};
};

/** The nearest ancestor that scrolls vertically right now. */
function findVerticalScroller(start: HTMLElement | null): HTMLElement | null {
	for (let element = start; element; element = element.parentElement) {
		if (element.scrollHeight > element.clientHeight) {
			const { overflowY } = getComputedStyle(element);
			if (overflowY === 'auto' || overflowY === 'scroll') {
				return element;
			}
		}
	}
	return null;
}

/** A wheel delta in pixels, whatever unit the event reports. */
function normalizeDeltaY(event: WheelEvent, scroller: HTMLElement): number {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
		return event.deltaY * 16;
	}
	if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
		return event.deltaY * scroller.clientHeight;
	}
	return event.deltaY;
}

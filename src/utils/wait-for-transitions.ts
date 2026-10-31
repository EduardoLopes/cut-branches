/**
 * Resolves once the transitions a click started inside `element` have had time
 * to play.
 *
 * Navigating mounts a whole list in one main-thread task, and a CSS transition
 * started by the click that triggered it (a Choice thumb sliding, a tab
 * changing colour) runs through that task unseen: by the first frame painted
 * afterwards it is already over, so the control appears to snap. Waiting for
 * the control's own transitions before navigating lets them play first.
 *
 * Reads the computed `transition-duration` + `transition-delay` rather than
 * `getAnimations()`: WebKit doesn't report transitions on pseudo-elements, and
 * a Choice thumb is a `::before`. Waits one frame first, so styles changed by
 * the click's handlers (which can run after the caller's) have applied. Never
 * waits longer than `maxMs`. Reduced motion zeroes the durations, which makes
 * this resolve after that one frame.
 */
export async function waitForTransitions(element: Element, maxMs = 400): Promise<void> {
	await new Promise((resolve) => requestAnimationFrame(resolve));

	const longest = Math.min(maxMs, longestTransition(element));
	if (longest > 0) await new Promise((resolve) => setTimeout(resolve, longest));
}

function longestTransition(element: Element): number {
	let longest = 0;
	for (const el of [element, ...element.querySelectorAll('*')]) {
		for (const pseudo of [null, '::before', '::after']) {
			const style = getComputedStyle(el, pseudo);
			const durations = parseTimes(style.transitionDuration);
			const delays = parseTimes(style.transitionDelay);
			durations.forEach((duration, i) => {
				// A zero duration never animates, whatever its delay. Delays repeat
				// to cover the durations list, per the CSS spec.
				if (duration > 0) longest = Math.max(longest, duration + delays[i % delays.length]!);
			});
		}
	}
	return longest;
}

/** A computed time list in ms, `"0.2s, 0.15s"` → `[200, 150]` (computed values are always in seconds). */
function parseTimes(value: string): number[] {
	return value.split(',').map((part) => Number.parseFloat(part) * 1000);
}

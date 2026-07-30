import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

interface FoldTextParams {
	duration?: number;
	delay?: number;
}

/**
 * Svelte transition that folds a single-line text element away: opacity,
 * max-width, and a soft blur interpolate together, so the text dissolves while
 * its box narrows in step with the sidebar's own width animation instead of
 * popping in and out of the layout. Width only — the line box keeps its full
 * height, so the text never looks like it's shrinking. The node must clip its
 * own line (`overflow: hidden` + `white-space: nowrap`) so the narrowing box
 * crops the text rather than wrapping it. Zero duration under
 * prefers-reduced-motion.
 */
export function foldText(
	_node: Element,
	{ duration = 200, delay = 0 }: FoldTextParams = {}
): TransitionConfig {
	const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	return {
		delay: motionReduced ? 0 : delay,
		duration: motionReduced ? 0 : duration,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; max-width: calc(${t} * 100%); filter: blur(${(1 - t) * 4}px)`
	};
}

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { splitHighlight, truncatePath, type TruncatePosition } from '$utils/truncate-path';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> {
		/** Extra Panda classes merged onto the root. */
		class?: string;
		/** The path to render. */
		path: string;
		/** Where the ellipsis goes once the path overflows. */
		truncate?: TruncatePosition;
		/**
		 * `middle` only: show at most this many directories even when more would
		 * fit; the rest collapse into the ellipsis.
		 */
		maxSegments?: number;
		/**
		 * A section of `path` to emphasise (typically its last segment). When set,
		 * the rest of the path is muted so the highlighted part carries the line.
		 */
		highlight?: string;
		/**
		 * Which edge the text hugs when it is shorter than the container. `end`
		 * pairs well with a highlighted last segment: it lands in the same column
		 * on every row regardless of how deep each path is.
		 */
		align?: 'start' | 'end';
	}

	let {
		path,
		truncate = 'middle',
		maxSegments,
		highlight,
		align = 'start',
		class: className,
		...rest
	}: Props = $props();

	let width = $state(0);
	// Bumped when the element's font changes (theme swap, zoom) so the measured
	// text is re-fitted even though `width` and `path` stayed the same.
	let fontKey = $state('');

	// One shared canvas is plenty: measurement is synchronous and the font is
	// set right before each call.
	const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;

	function fontOf(el: HTMLElement): string {
		const style = getComputedStyle(el);
		return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	}

	// Attachment rather than `bind:this` + `$effect`: the node arrives directly,
	// so there is no "not mounted yet" state to guard against.
	function observe(node: HTMLElement) {
		const observer = new ResizeObserver(([entry]) => {
			width = entry.contentRect.width;
			fontKey = fontOf(node);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	const displayed = $derived.by(() => {
		// Before the first measurement the width is unknown; render the full
		// path so there's something to size against.
		if (width === 0) return path;
		context.font = fontKey;
		return truncatePath(path, width, (text) => context.measureText(text).width, {
			position: truncate,
			maxSegments
		});
	});

	const runs = $derived(highlight ? splitHighlight(path, displayed, highlight) : null);
</script>

<span
	{@attach observe}
	class={cx(
		css({
			display: 'block',
			minWidth: '0',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
			textAlign: align === 'end' ? 'right' : 'left'
		}),
		className
	)}
	title={path}
	data-testid="truncated-path"
	{...rest}
	>{#if runs}{#each runs as run, index (index)}<span
				class={css({ color: run.highlighted ? 'inherit' : 'neutral.text.muted' })}
				data-highlighted={run.highlighted ? '' : undefined}>{run.text}</span
			>{/each}{:else}{displayed}{/if}</span
>

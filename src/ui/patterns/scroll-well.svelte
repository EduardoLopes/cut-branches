<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scrollShadow } from '$lib/scroll-shadow';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props {
		/** The rows. Rendered inside the scroller. */
		children: Snippet;
		/**
		 * Sizing for the well itself — how it takes part in its parent's layout,
		 * e.g. `css({ flex: '1', minHeight: '0' })` or `css({ maxHeight: '50vh' })`.
		 */
		class?: string;
		/** Overrides for the scroller (its padding/gap around the rows). */
		scrollerClass?: string;
		/** Bindable reference to the scrolling element; virtualizers need it. */
		scroller?: HTMLElement | null;
		/**
		 * `data-testid` of the scroller. The shadow bars get
		 * `${testId}-shadow-top` / `${testId}-shadow-bottom`.
		 */
		testId?: string;
	}

	let {
		children,
		class: className,
		scrollerClass,
		scroller = $bindable(null),
		testId = 'scroll-well'
	}: Props = $props();

	const topShadowId = $derived(`${testId}-shadow-top`);
	const bottomShadowId = $derived(`${testId}-shadow-bottom`);
</script>

<!--
	A recessed list surface with scroll hints: rows sit on `surface.valley`, one
	tier below the dialog, and a shadow appears at an edge only while there is
	more content past it. The scroller carries `data-overflow-top/bottom` (from
	the scroll-shadow action); the two 1px bars that follow it sit just outside
	the well's edges and reveal themselves off those attributes, so their `md`
	shadow spills inward through the well's overflow clip. No local state.
-->
<div
	class={cx(
		css({
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			borderRadius: 'md',
			background: 'neutral.surface.valley'
		}),
		className
	)}
>
	<div
		bind:this={scroller}
		use:scrollShadow
		class={cx(
			css({
				display: 'flex',
				flexDirection: 'column',
				gap: '3xs',
				flex: '1',
				minHeight: '0',
				padding: '2xs',
				overflowY: 'auto',
				overflowX: 'hidden'
			}),
			scrollerClass
		)}
		data-testid={testId}
	>
		{@render children()}
	</div>
	<!-- The bars must stay siblings *after* the scroller: `~` only looks
	     forward from the attributed element. -->
	<div
		aria-hidden="true"
		class={css({
			position: 'absolute',
			top: '-1px',
			insetInline: '0',
			height: '1px',
			boxShadow: 'md',
			pointerEvents: 'none',
			opacity: 0,
			transition: 'opacity 150ms ease',
			'[data-overflow-top] ~ &': { opacity: 1 }
		})}
		data-testid={topShadowId}
	></div>
	<div
		aria-hidden="true"
		class={css({
			position: 'absolute',
			bottom: '-1px',
			insetInline: '0',
			height: '1px',
			boxShadow: 'md',
			pointerEvents: 'none',
			opacity: 0,
			transition: 'opacity 150ms ease',
			'[data-overflow-bottom] ~ &': { opacity: 1 }
		})}
		data-testid={bottomShadowId}
	></div>
</div>

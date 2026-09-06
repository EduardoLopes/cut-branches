<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scrollShadow } from '$lib/scroll-shadow';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props {
		/** The rows. Rendered inside the scroller. */
		children: Snippet;
		/**
		 * A bar attached to the top of the well — the list's own controls
		 * (select-all, a count). It sits on a surface one tier above the rows and
		 * is laid out as a `space-between` row, with its inline padding matched to
		 * the rows' so a checkbox here lines up with the rows' checkboxes.
		 */
		header?: Snippet;
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
		 * `data-testid` of the scroller. The well gets `${testId}-well`, the header
		 * `${testId}-header` and the shadow bars `${testId}-shadow-top` /
		 * `${testId}-shadow-bottom`.
		 */
		testId?: string;
	}

	let {
		children,
		header,
		class: className,
		scrollerClass,
		scroller = $bindable(null),
		testId = 'scroll-well'
	}: Props = $props();

	const wellId = $derived(`${testId}-well`);
	const headerId = $derived(`${testId}-header`);
	const topShadowId = $derived(`${testId}-shadow-top`);
	const bottomShadowId = $derived(`${testId}-shadow-bottom`);

	// The rows' own inset: the scroller's padding plus the row's inline padding.
	// Matching it puts the header's leading control in the rows' first column.
	const rowInset = 'calc(token(spacing.2xs) + token(spacing.sm))';
</script>

<!--
	A recessed list surface with scroll hints: rows sit on `surface.valley`, one
	tier below the dialog, and a shadow appears at an edge only while there is
	more content past it. The optional `header` is part of the same panel — it
	shares the well's border radius and clip, so the list's controls read as
	attached to the list they act on rather than floating above it.

	The scroller carries `data-overflow-top/bottom` (from the scroll-shadow
	action); the two 1px bars that follow it sit just outside the scroller's own
	edges — inside the well, so they land under the header rather than at the top
	of the panel — and reveal themselves off those attributes, so their `md`
	shadow spills inward through the well's overflow clip. No local state.
-->
<div
	class={cx(
		css({
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			borderRadius: 'md',
			background: 'neutral.surface.valley'
		}),
		className
	)}
	data-testid={wellId}
>
	{#if header}
		<div
			class={css({
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 'sm',
				flexShrink: '0',
				paddingX: rowInset,
				paddingY: 'xs',
				background: 'neutral.surface.base',
				borderBottomWidth: '1px',
				borderBottomStyle: 'solid',
				borderBottomColor: 'neutral.border.muted'
			})}
			data-testid={headerId}
		>
			{@render header()}
		</div>
	{/if}
	<div
		class={css({
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0'
		})}
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
</div>

<script lang="ts">
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { css } from '@pindoba/styled-system/css';
	import { translucent } from '@pindoba/styled-system/patterns';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Filters and scope controls — "which subset of this page". */
		left?: Snippet;
		/** Actions on the current selection (search, bulk operations). */
		right?: Snippet;
		/**
		 * Which edge of the well the bar sticks to. `bottom` is for pagination and
		 * commit bars.
		 * @default 'top'
		 */
		placement?: 'top' | 'bottom';
	}

	const { left, right, placement = 'top', ...rest }: Props = $props();
</script>

<!--
	The frosted sticky bar every page uses for filters and bulk actions. Lives in
	`ui/patterns` rather than a domain so worktree-management and
	branch-management can share one implementation instead of two copies.
-->
<div
	class={css(
		translucent.raw({
			blur: 'md',
			background: 'neutral.surface.soft/50 !important'
		}),
		placement === 'bottom'
			? css.raw({
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 'md',
					paddingBlock: 'sm',
					// Matches the well's content inset, so the bar's leading control sits
					// on the same column as the per-row controls in the list below.
					paddingInline: 'md',
					zIndex: '10',
					flexShrink: '0',
					position: 'sticky',
					bottom: '0',
					marginTop: 'auto',
					borderTop: '1px solid token(colors.neutral.border.muted)'
				})
			: css.raw({
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 'md',
					paddingBlock: 'sm',
					// Matches the well's content inset, so the bar's leading control sits
					// on the same column as the per-row controls in the list below.
					paddingInline: 'md',
					zIndex: '10',
					flexShrink: '0',
					position: 'sticky',
					top: '0',
					borderBottom: '1px solid token(colors.neutral.border.muted)'
				})
	)}
	data-testid="bulk-actions-container"
	{...rest}
>
	<!--
		Both cells hug their contents — no reserved row height. That keeps the bar
		as short as its controls allow, and stays consistent across pages only
		because every page now puts the same shape in here (an `lg` checkbox plus
		small muted text). A page that renders nothing on the left will produce a
		shorter bar.
	-->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'md',
			minWidth: '0'
		})}
		data-testid="bulk-actions-left"
	>
		{#if left}
			{@render left()}
		{/if}
	</div>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs',
			flexShrink: '0'
		})}
		data-testid="bulk-actions-right"
	>
		{#if right}
			{@render right()}
		{/if}
	</div>
</div>

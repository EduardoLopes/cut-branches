<script lang="ts">
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { css } from '@pindoba/styled-system/css';

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
	The sticky bar every page uses for filters and bulk actions. Lives in
	`ui/patterns` rather than a domain so worktree-management and
	branch-management can share one implementation instead of two copies.

	Opaque `surface.hill` — one tier above the well's `surface.ground`, so the bar
	reads as chrome raised off the well floor, and rows scrolling underneath are
	hidden outright instead of ghosting through a translucent fill. The edge
	border is what separates it from the content.
-->
<div
	class={css(
		// Fixed row height: the bar is chrome, so it must not resize with whatever
		// controls a page puts in it — that's what let sibling views (Active vs
		// Deleted branches) drift a few pixels apart. Everything inside centres
		// against it.
		css.raw({ background: 'neutral.surface.hill', minHeight: '53px' }),
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
		Both cells centre their contents inside the bar's fixed height above, so
		controls of different heights (a segmented filter, an `sm` field, a bulk
		action) sit on one line no matter which page fills the bar.
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

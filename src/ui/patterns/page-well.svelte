<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import type { Snippet } from 'svelte';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props {
		/**
		 * Sticky filter/action bar, rendered flush against the well's top edge.
		 * Use `PageToolbar`. Filters live here; sibling-page navigation belongs in
		 * the header instead.
		 */
		toolbar?: Snippet;
		/** Sticky bar pinned to the well's bottom edge (pagination, commit bar). */
		footer?: Snippet;
		/**
		 * Floats over the bottom of the scroll area, e.g. a container-anchored
		 * BulkBar. Its positioned ancestor is the content region (not the whole
		 * well), so it clears the footer. Padded content gets the bottom
		 * clearance for free; unpadded content (its own scroll port) adds
		 * `var(--page-well-overlay-clearance)` to its bottom padding.
		 */
		overlay?: Snippet;
		/** Scrolling content. Cards inside should use `radius="inner"`. */
		children: Snippet;
		/** Shows the well's loading overlay without collapsing the layout. */
		isLoading?: boolean;
		/** Drops the content padding — for content that manages its own insets (e.g. a split pane). */
		padded?: boolean;
		/** `data-testid` for the well root. */
		testId?: string;
	}

	const {
		toolbar,
		footer,
		overlay,
		children,
		isLoading = false,
		padded = true,
		testId
	}: Props = $props();

	/** Room for the last row to scroll out from under the overlay: the bar's
	 *  `lg` bottom offset plus its own height (pindoba's bulk-bar demo pads
	 *  its pane by the same 80px). */
	const OVERLAY_CLEARANCE = '80px';
</script>

<!--
	The recessed content well. A real Panel (not a styled div) so it takes part in
	the nesting cascade in both directions: `radius="inner"` derives its own corner
	from the shell's geometry (see `app-shell.svelte`) instead of pinning a tier
	that has to be re-tuned whenever the shell's does, and it passes that
	geometry down so the cards inside stay concentric with their own
	`radius="inner"`.

	Padding is `none` on the root so the toolbar and footer can span edge to edge;
	the scroll area re-establishes the inset as its own transparent Panel level,
	which is what republishes `--panel-out-padding` for the cards.
-->
<Panel
	background="surface.ground"
	border="muted"
	radius="inner"
	padding="none"
	class={css({
		display: 'flex',
		flexDirection: 'column',
		flex: '1',
		minHeight: '0',
		overflow: 'hidden',
		mx: 'md',
		mb: 'md'
	})}
	data-testid={testId}
>
	{#if toolbar}
		{@render toolbar()}
	{/if}

	<!-- The overlay's positioned ancestor: the content region only, so a
	     container-anchored bar floats above the footer rather than over it. -->
	<div
		class={css({
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0'
		})}
		style:--page-well-overlay-clearance={overlay ? OVERLAY_CLEARANCE : '0px'}
	>
		<Loading
			loading={isLoading}
			passThrough={{
				root: {
					style: css.raw({
						display: 'flex',
						flexDirection: 'column',
						flex: '1',
						minHeight: '0',
						borderRadius: '0'
					})
				}
			}}
		>
			<Panel
				background="transparent"
				border="none"
				radius="inner"
				padding={padded ? 'md' : 'none'}
				class={cx(
					css({
						display: 'flex',
						flexDirection: 'column',
						flex: '1',
						minHeight: '0',
						overflowY: 'auto',
						overflowX: 'hidden'
					}),
					// A longhand, so it wins over the Panel's padding shorthand.
					padded &&
						overlay &&
						css({ paddingBottom: 'calc(token(spacing.md) + var(--page-well-overlay-clearance))' })
				)}
			>
				{@render children()}
			</Panel>
		</Loading>

		{#if overlay}
			{@render overlay()}
		{/if}
	</div>

	{#if footer}
		{@render footer()}
	{/if}
</Panel>

<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/**
		 * Sticky filter/action bar, rendered flush against the well's top edge.
		 * Use `PageToolbar`. Filters live here; sibling-page navigation belongs in
		 * the header instead.
		 */
		toolbar?: Snippet;
		/** Sticky bar pinned to the well's bottom edge (pagination, commit bar). */
		footer?: Snippet;
		/** Scrolling content. Cards inside should use `radius="inner"`. */
		children: Snippet;
		/** Shows the well's loading overlay without collapsing the layout. */
		isLoading?: boolean;
		/** Drops the content padding — for content that manages its own insets (e.g. a split pane). */
		padded?: boolean;
		/** `data-testid` for the well root. */
		testId?: string;
	}

	const { toolbar, footer, children, isLoading = false, padded = true, testId }: Props = $props();
</script>

<!--
	The recessed content well. A real Panel (not a styled div) so it publishes its
	radius and padding down the nesting cascade and the cards inside stay
	concentric with `radius="inner"`.

	Padding is `none` on the root so the toolbar and footer can span edge to edge;
	the scroll area re-establishes the inset as its own transparent Panel level,
	which is what republishes `--panel-out-padding` for the cards.
-->
<Panel
	background="surface.deep"
	border="muted"
	radius="xl"
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
			class={css({
				display: 'flex',
				flexDirection: 'column',
				flex: '1',
				minHeight: '0',
				overflowY: 'auto',
				overflowX: 'hidden'
			})}
		>
			{@render children()}
		</Panel>
	</Loading>

	{#if footer}
		{@render footer()}
	{/if}
</Panel>

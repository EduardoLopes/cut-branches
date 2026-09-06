<script lang="ts">
	import Icon from '@iconify/svelte';
	import Panel from '@pindoba/svelte-panel';
	import Stamp from '@pindoba/svelte-stamp';
	import { foldText } from '../utils/fold-text';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** When true, the header collapses to a narrow rail showing only the brand mark. */
		collapsed?: boolean;
	}

	const { collapsed = false }: Props = $props();
</script>

<!--
	A Panel, not a div, purely to be a nesting level: it publishes its md
	padding to the concentric cascade so the Stamp's `radius="inner"` has
	something to subtract. A plain div publishes nothing, and the mark would
	inherit the sidebar's own corner instead of one inset from it.
-->
<Panel
	as="header"
	background="transparent"
	border="muted"
	radius="inner"
	padding="md"
	radiusBottom="none"
	class={css({
		display: 'flex',
		alignItems: 'center',
		gap: '2xs',
		transition: 'padding-inline 350ms cubic-bezier(0.32, 0.72, 0, 1)',
		_motionReduce: { transition: 'none' },
		// Same hairline the two footer sections open with.
		borderWidth: '0',
		borderBottomWidth: '1px'
	})}
	data-rail={collapsed}
>
	<!-- Pinned to 3.2rem: size md derives a fluid 2.9333rem off the type scale. -->
	<Stamp
		size="md"
		shape="square"
		radius="inner"
		emphasis="primary"
		feedback="primary"
		border="none"
		aria-hidden="true"
		passThrough={{
			root: {
				style: css.raw({
					width: '3.2rem',
					minWidth: '3.2rem',
					height: '3.2rem',
					// 50% of the box, down from the recipe's 60%.
					fontSize: '1.6rem',
					boxShadow:
						'inset 0 1px 0 0 color-mix(in srgb, white 30%, transparent), inset 0 0 0 1px color-mix(in srgb, white 12%, transparent)'
				})
			}
		}}
	>
		<Icon icon="game-icons:tree-branch" />
	</Stamp>
	{#if !collapsed}
		<!-- Folds out as the rail closes, unfurls as it reopens. -->
		<h2
			in:foldText={{ duration: 200 }}
			out:foldText={{ duration: 150 }}
			class={css({
				flex: 1,
				minWidth: 0,
				overflow: 'hidden',
				whiteSpace: 'nowrap',
				textOverflow: 'ellipsis',
				margin: '0',
				ml: 'xs',
				textStyle: 'heading.2xs',
				letterSpacing: 'tight',
				// Not accent-coloured — the mark already carries the brand blue.
				color: 'neutral.text.bold'
			})}
		>
			<span class={css({ fontWeight: 'bold' })}>Cut</span><span
				class={css({ fontWeight: 'medium', color: 'neutral.text.muted' })}>&nbsp;Branches</span
			>
		</h2>
	{/if}
</Panel>

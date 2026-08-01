<script lang="ts">
	import Icon from '@iconify/svelte';
	import Stamp from '@pindoba/svelte-stamp';
	import { foldText } from '../utils/fold-text';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** When true, the header collapses to a narrow rail showing only the brand mark. */
		collapsed?: boolean;
	}

	const { collapsed = false }: Props = $props();
</script>

<div
	class={css({
		display: 'flex',
		alignItems: 'center',
		gap: '3xs',
		// One geometry for both states: paddingLeft 1.7rem puts the logo's left
		// edge on the icon-glyph column (1.7 + 0.1 cell slack = 1.8rem — same
		// line as the "Repositories" heading) AND its centre on the rail's
		// centre line (1.7 + 3.4/2 = 3.4rem). Nothing here changes on collapse,
		// so the logo holds perfectly still through the animation.
		paddingBlock: 'sm',
		paddingRight: 'sm',
		paddingLeft: '1.7rem',
		'&[data-rail="true"]': {
			paddingRight: '1.7rem'
		}
	})}
	data-rail={collapsed}
>
	<!-- Fixed-width cell around the 3.2rem stamp, constant in BOTH states so
	     the logo never jumps (an `auto → fixed` width flip can't
	     interpolate). -->
	<span
		class={css({
			display: 'flex',
			justifyContent: 'center',
			width: '3.4rem'
		})}
	>
		<Stamp
			size="md"
			shape="square"
			emphasis="primary"
			feedback="primary"
			shadow="md"
			aria-hidden="true"
		>
			<Icon icon="game-icons:tree-branch" />
		</Stamp>
	</span>
	{#if !collapsed}
		<!-- Folds out quickly as the rail closes over it, and unfurls in step
		     with the sidebar reopening. -->
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
				textStyle: 'heading.2xs',
				letterSpacing: 'tight',
				color: 'primary.800',
				_dark: { color: 'primary.950' }
			})}
		>
			Cut Branches
		</h2>
	{/if}
</div>

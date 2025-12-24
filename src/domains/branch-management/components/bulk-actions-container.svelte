<script lang="ts">
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { css } from '@pindoba/styled-system/css';
	import { translucent } from '@pindoba/styled-system/patterns';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		left?: Snippet;
		right?: Snippet;
	}

	const { left, right, ...rest }: Props = $props();
</script>

<div
	class={css(
		translucent.raw({
			blur: 'md'
		}),
		css.raw({
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 'md',
			zIndex: '10',
			flexShrink: '0',
			position: 'sticky',
			top: '0',
			borderBottom: '1px solid token(colors.neutral.border)'
		})
	)}
	data-testid="bulk-actions-container"
	{...rest}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			height: '100%',
			gap: 'md'
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
			gap: 'xs'
		})}
		data-testid="bulk-actions-right"
	>
		{#if right}
			{@render right()}
		{/if}
	</div>
</div>

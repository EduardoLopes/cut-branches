<script lang="ts">
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { css } from '@pindoba/panda/css';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		left?: Snippet;
		right?: Snippet;
	}

	const { left, right, ...rest }: Props = $props();
</script>

<div
	class={css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 'md',
		zIndex: '10',
		flexShrink: '0',
		position: 'sticky',
		top: '0',
		translucent: 'md',
		_light: {
			borderBottom: '1px solid token(colors.neutral.400)'
		},
		_dark: {
			borderBottom: '1px solid token(colors.neutral.200)'
		}
	})}
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

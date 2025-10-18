<script lang="ts">
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();
</script>

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)',
		pl: 0
	})}
>
	<main
		class={css({
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			position: 'relative',
			height: '100%',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			}
		})}
	>
		{#if children}
			{@render children()}
		{/if}
	</main>
</div>

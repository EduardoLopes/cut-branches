<script lang="ts">
	import { type Snippet } from 'svelte';
	import Menu from '$lib/components/menu.svelte';
	import { css } from '@pindoba/panda/css';
	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div
	class={css({
		width: '100%',
		flex: 1,
		display: 'flex',
		flexDirection: 'column'
	})}
>
	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: 'max-content auto'
		})}
	>
		<Menu />
		{@render children?.()}
	</div>
</div>

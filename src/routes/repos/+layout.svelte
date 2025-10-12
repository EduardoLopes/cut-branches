<script lang="ts">
	import { type Snippet } from 'svelte';
	import MenuView from '$domains/repository-navigation/views/menu-view.svelte';
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
		<MenuView />
		{@render children?.()}
	</div>
</div>

<script>
	import Menu from '$lib/components/menu.svelte';
	import { css } from '@pindoba/panda/css';
</script>

<div
	class={css({
		width: '100%',
		display: 'grid',
		gridTemplateColumns: 'max-content auto',
		height: '100vh'
	})}
>
	<Menu />
	<slot />
</div>

<script>
	import Footer from '$lib/components/footer.svelte';
	import Menu from '$lib/components/menu.svelte';
	import { css } from '@pindoba/panda/css';
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
		<slot />
	</div>
	<Footer />
</div>

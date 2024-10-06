<script>
	import Menu from '$lib/Menu.svelte';
</script>

<div class="content">
	<Menu />
	<slot />
</div>

<style>
	.content {
		width: 100%;
		display: grid;
		grid-template-columns: max-content auto;
		height: 100vh;
	}
</style>

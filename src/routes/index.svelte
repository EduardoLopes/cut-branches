<script>
	import { onDestroy, onMount } from 'svelte';
	import Menu from '$lib/Menu/index.svelte';
	import Branches from '$lib/Branches/index.svelte';

	let unsubscribeRepos;

	onMount(() => {
		// TODO: update repos on app mount
	});

	onDestroy(unsubscribeRepos);
</script>

<div class="content">
	<Menu />
	<Branches />
</div>

<style>
	.content {
		width: 100%;
		display: grid;
		grid-template-columns: max-content auto;
		height: 100%;
	}
</style>

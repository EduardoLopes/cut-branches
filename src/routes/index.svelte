<script>
	import { onDestroy, onMount } from 'svelte';
	import Menu from '$lib/Menu/index.svelte';
	import Branches from '$lib/Branches/index.svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores';

	let unsubscribeRepos = repos.subscribe((value) => {
		if (value.length === 0) {
			goto('/add-first');
		}
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

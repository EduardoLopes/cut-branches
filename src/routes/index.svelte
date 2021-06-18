<script>
	import { repos } from '$lib/stores';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AddRepo from '$lib/AddRepo/index.svelte';
	import Menu from '$lib/Menu/index.svelte';
	import Branches from '$lib/Branches/index.svelte';
	import Repo from '$lib/Repo/index.svelte';

	let reposValue;

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

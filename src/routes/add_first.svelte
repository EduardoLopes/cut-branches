<script>
	import AddRepo from '$lib/AddRepo/index.svelte';
	import { repos } from '$lib/stores';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let unsubscribeRepos;

	onMount(() => {
		unsubscribeRepos = repos.subscribe((value) => {
			if (value && value?.length >= 1) {
				goto('/');
			}
		});
	});

	onDestroy(unsubscribeRepos);
</script>

<svelte:head>
	<title>Cut branches</title>
</svelte:head>

<div class="content">
	<AddRepo />
</div>

<style>
	.content {
		width: 100%;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>

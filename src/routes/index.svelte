<script>
	import { repos } from '$lib/stores';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AddRepo from '$lib/AddRepo/index.svelte';
	import Repo from '$lib/Repo/index.svelte';

	let reposValue;

	let unsubscribeRepos;

	onMount(() => {
		unsubscribeRepos = repos.subscribe((value) => {
			reposValue = value;

			if (value && value?.length === 0) {
				goto('/add_first');
			}
		});
	});

	onDestroy(unsubscribeRepos);
</script>

<div class="content">
	<AddRepo />

	{#if reposValue}
		{#each reposValue as path}
			<Repo {path} />
		{/each}
	{/if}
</div>

<style>
	.content {
		width: 100%;
		grid-template-rows: min-content;
		display: grid;
		gap: 16px;
		justify-content: center;
		padding: 16px 0;
	}
</style>

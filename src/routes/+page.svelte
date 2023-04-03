<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Menu from '$lib/Menu/index.svelte';
	import Branches from '$lib/Branches/index.svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores';
	import { page } from '$app/stores';

	onMount(() => {
		let unsubscribeRepos = repos.subscribe((value) => {
			if (value.length === 0) {
				goto('/add-first');
			}

			if (value.length > 0 && $page.url.pathname === '/' && !$page.params.id) {
				goto(`/repos/${value[0].name}`);
			}
		});

		onDestroy(unsubscribeRepos);
	});
</script>

<div class="content">
	<slot />
</div>

<style>
	.content {
		width: 100%;
		display: grid;
		grid-template-columns: max-content auto;
		height: 100%;
	}
</style>

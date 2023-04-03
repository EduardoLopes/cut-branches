<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Menu from '$lib/Menu/index.svelte';
	import Branches from '$lib/Branches/index.svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores';
	import { navigating, page } from '$app/stores';

	function checkRedirect() {
		if ($repos.length === 0) {
			goto('/add-first');
		}

		if ($repos.length > 0 && $page.url.pathname === '/' && !$page.params.id) {
			goto(`/repos/${$repos[0].name}`);
		}
	}
	onMount(() => {
		checkRedirect();
	});

	// checks every route change
	$: if ($navigating) checkRedirect();
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

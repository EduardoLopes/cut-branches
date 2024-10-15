<script lang="ts">
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/stores';
	import { repos } from '$lib/stores/branches';
	import { onMount } from 'svelte';

	function checkRedirect() {
		if ($repos.length === 0) {
			goto('/add-first');
		}

		// if is in any route that requires a repo id and the repo does not exist in the app anymore
		const idExists = $repos.filter((item) => item.id === $page.params.id).length > 0;

		if ($repos.length > 0 && !idExists) {
			goto(`/repos/${$repos[0].id}`);
		}
	}

	onMount(() => {
		checkRedirect();
	});

	// checks every time route change
	$: if ($navigating) checkRedirect();
	// checks every time the repos store changes
	$: if ($repos) checkRedirect();
</script>

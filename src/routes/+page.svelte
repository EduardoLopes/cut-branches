<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/stores';
	import { repositories } from '$lib/stores/repositories.svelte';

	function checkRedirect() {
		console.log('redirecting to /add-first');

		if (repositories.list.length === 0) {
			goto('/add-first');
		}

		// if is in any route that requires a repo id and the repo does not exist in the app anymore
		const idExists = Boolean(repositories.findById($page.params.id));

		if (repositories.first?.id && !idExists) {
			goto(`/repos/${repositories.first.id}`);
		}
	}

	$effect(() => {
		// checks every time route change
		if ($navigating || repositories.list) {
			checkRedirect();
		}
	});

	onMount(() => {
		checkRedirect();
	});
</script>

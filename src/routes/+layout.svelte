<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { repos } from '$lib/stores';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import { onDestroy, onMount } from 'svelte';
	import '../app.css';

	onMount(() => {
		let unsubscribeRepos = repos.subscribe((value) => {
			if (value.length === 0) {
				goto('/add-first');
			}

			if (value.length > 0 && $page.url.pathname.startsWith('/repos/') && !$page.params.id) {
				goto(`/repos/${value[0].name}`);
			}
		});

		onDestroy(unsubscribeRepos);
	});

	export const prerender = true;
	export const ssr = false;
</script>

<main>
	<SvelteToast options={{ intro: { y: 100 } }} />
	<slot />
</main>

<footer />

<style>
	main {
		min-height: 100vh;
	}

	:root {
		--toastContainerTop: auto;
		--toastContainerRight: 2rem;
		--toastContainerBottom: 0;
		--toastContainerLeft: 2rem;
		--toastWidth: 100%;
		--toastMinHeight: 1.5rem;
		--toastMsgPadding: 1rem;
	}
</style>

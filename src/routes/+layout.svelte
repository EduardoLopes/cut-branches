<script>
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';

	import '../app.css';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<SvelteToast options={{ intro: { y: 100 } }} />
	<slot />
	<footer />
</QueryClientProvider>

<style>
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

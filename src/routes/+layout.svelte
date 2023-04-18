<script lang="ts">
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import '../app.css';
	import type { ServiceError } from '$lib/services/models';
	import Toast, { toast } from '$lib/primitives/Toast.svelte';

	const mutationCache = new MutationCache({
		onError: (error) => {
			const e = error as ServiceError;
			toast.danger({ message: e.message, description: e.description });
		}
	});

	const queryCache = new QueryCache({
		onError: (error) => {
			const e = error as ServiceError;
			toast.danger({ message: e.message, description: e.description });
		}
	});

	const queryClient = new QueryClient({
		mutationCache,
		queryCache,
		defaultOptions: {
			queries: {
				enabled: browser,
				retry: 0,
				refetchOnWindowFocus: false
			}
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Toast />
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

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
		onSuccess: (_data, _variabled, _context, mutation) => {
			if (mutation.meta?.showSuccessToast) {
				const toastInfo = mutation.meta?.toast as { message: string; description: string };

				if (toastInfo.message) {
					toast.success({ message: toastInfo.message, description: toastInfo.description });
				}
			}
		},
		onError: (error, _variabled, _context, mutation) => {
			const e = error as ServiceError;

			if (mutation.meta?.showErrorToast) {
				toast.danger({ message: e.message, description: e.description });
			}
		}
	});

	const queryCache = new QueryCache({
		onSuccess: (_, query) => {
			if (query.meta?.showSuccessToast) {
				const toastInfo = query.meta?.toast as { message: string; description: string };

				console.log(toastInfo);
				if (toastInfo.message) {
					toast.success({ message: toastInfo.message, description: toastInfo.description });
				}
			}
		},
		onError: (error, query) => {
			const e = error as ServiceError;

			if (query.meta?.showErrorToast) {
				toast.danger({ message: e.message, description: e.description });
			}
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

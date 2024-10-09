<script lang="ts">
	import '../app.css';
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import type { ServiceError } from '$lib/services/models';
	import Toast, { toast } from '$lib/primitives/Toast.svelte';
	import { repos } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/stores';
	import { onMount } from 'svelte';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';

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
			const e = error as unknown as ServiceError;

			if (mutation.meta?.showErrorToast) {
				toast.danger({ message: e.message, description: e.description });
			}
		}
	});

	const queryCache = new QueryCache({
		onSuccess: (_, query) => {
			if (query.meta?.showSuccessToast) {
				const toastInfo = query.meta?.toast as { message: string; description: string };

				if (toastInfo.message) {
					toast.success({ message: toastInfo.message, description: toastInfo.description });
				}
			}
		},
		onError: (error, query) => {
			const e = error as unknown as ServiceError;

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

<ThemeModeSelectScript />

<QueryClientProvider client={queryClient}>
	<Toast />
	<slot />
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

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
	import { repos } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/stores';
	import { onMount } from 'svelte';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import { createNotifications } from '$lib/stores/notifications';

	const notifications = createNotifications();

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
			if (mutation.meta?.showSuccessNotification) {
				const notificationInfo = mutation.meta?.notification as {
					message: string;
					description: string;
				};

				if (notificationInfo.message) {
					notifications.push({
						feedback: 'success',
						title: notificationInfo.message,
						message: notificationInfo.description
					});
				}
			}
		},
		onError: (error, _variabled, _context, mutation) => {
			const e = error as unknown as ServiceError;

			if (mutation.meta?.showErrorNotification) {
				notifications.push({ feedback: 'danger', title: e.message, message: e.description });
			}
		}
	});

	const queryCache = new QueryCache({
		onSuccess: (_, query) => {
			if (query.meta?.showSuccessNotification) {
				const notificationInfo = query.meta?.notification as {
					message: string;
					description: string;
				};

				if (notificationInfo.message) {
					notifications.push({
						feedback: 'success',
						title: notificationInfo.message,
						message: notificationInfo.description
					});
				}
			}
		},
		onError: (error, query) => {
			const e = error as unknown as ServiceError;

			if (query.meta?.showErrorNotification) {
				notifications.push({ feedback: 'danger', title: e.message, message: e.description });
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
	<div>
		<slot />
	</div>
</QueryClientProvider>

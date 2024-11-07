<script lang="ts">
	import '../app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import type { ServiceError } from '$lib/services/models';
	import { notifications } from '$lib/stores/notifications.svelte';

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

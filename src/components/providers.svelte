<script lang="ts">
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import { type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createError } from '$utils/error-utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const mutationCache = new MutationCache({
		onSuccess: (_data, _variabled, _context, mutation) => {
			if (mutation.meta?.showSuccessNotification) {
				const notificationInfo = mutation.meta?.notification;

				notifications.push({
					feedback: 'success',
					title: notificationInfo?.title,
					message: notificationInfo?.message
				});
			}
		},
		onError: (error, _variabled, _context, mutation) => {
			const e = createError(error);

			if (mutation.meta?.showErrorNotification) {
				const notificationInfo = mutation.meta?.notification;

				console.log({ e });

				notifications.push({
					feedback: 'danger',
					title: notificationInfo?.title ?? e.message ?? e.kind,
					message: notificationInfo?.message ?? e.description
				});
			}
		}
	});

	const queryCache = new QueryCache({
		onSuccess: (_, query) => {
			if (query.meta?.showSuccessNotification) {
				const notificationInfo = query.meta?.notification;

				notifications.push({
					feedback: 'success',
					title: notificationInfo?.title,
					message: notificationInfo?.message
				});
			}
		},
		onError: (error, query) => {
			const e = createError(error);

			if (query.meta?.showErrorNotification) {
				const notificationInfo = query.meta?.notification;

				notifications.push({
					feedback: 'danger',
					title: notificationInfo?.title ?? e.message ?? e.kind,
					message: notificationInfo?.message ?? e.description
				});
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
	{@render children?.()}
</QueryClientProvider>

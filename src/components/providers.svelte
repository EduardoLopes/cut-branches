<script lang="ts">
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import type { QueryClientConfig } from '@tanstack/svelte-query';
	import { mergeRight } from 'ramda';
	import { type Snippet } from 'svelte';
	import DomainsHandlers from './domains-handlers.svelte';
	import { browser } from '$app/environment';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { createError } from '$utils/error-utils';
	import { shouldInvalidate } from '$utils/query-key-utils';

	interface Props {
		queryClientOptions?: QueryClientConfig;
		children?: Snippet;
	}

	let { children, queryClientOptions }: Props = $props();

	const mutationCache = new MutationCache({
		onSuccess: async (_data, _variabled, _context, mutation) => {
			// Show success notification
			if (mutation.meta?.showSuccessNotification) {
				const notificationInfo = mutation.meta?.notification;

				notifications.push({
					feedback: 'success',
					title: notificationInfo?.title,
					message: notificationInfo?.message
				});
			}

			// Automatic query invalidation based on mutationKey
			// This follows the pattern from: https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations
			// Uses resource-based keys: mutationKey ['branches'] invalidates all queries starting with ['branches']
			const mutationKey = mutation.options?.mutationKey;
			const resources = (mutation.meta?.resources as string[] | undefined) ?? [];
			const awaitInvalidates = mutation.meta?.awaitInvalidates as string[][] | undefined;

			// Use either resources list (for multi-resource) or mutationKey
			const resourcesToInvalidate =
				resources.length > 0 ? resources.map((r) => [r]) : mutationKey ? [mutationKey] : [];

			if (resourcesToInvalidate.length > 0) {
				const awaitedPromises: Promise<unknown>[] = [];
				const backgroundPromises: Promise<unknown>[] = [];

				// Invalidate queries for each resource using predicate matching
				resourcesToInvalidate.forEach((resourceKey) => {
					const invalidationPromise = queryClient.invalidateQueries({
						predicate: (query) =>
							Array.isArray(resourceKey) && shouldInvalidate(query.queryKey, resourceKey)
					});
					backgroundPromises.push(invalidationPromise);
				});

				// Check if any awaited invalidations are needed
				if (awaitInvalidates && awaitInvalidates.length > 0) {
					// For awaited invalidations, we need to invalidate those specific queries and wait
					const awaitPromises = awaitInvalidates.map((queryKey) =>
						queryClient.invalidateQueries({ queryKey })
					);
					awaitedPromises.push(...awaitPromises);
				}

				// Start background invalidations without awaiting
				if (backgroundPromises.length > 0) {
					Promise.all(backgroundPromises).catch(console.error);
				}

				// Await only the important invalidations
				if (awaitedPromises.length > 0) {
					return Promise.all(awaitedPromises);
				}
			}
		},
		onError: (error, _variabled, _context, mutation) => {
			const e = createError(error);

			if (mutation.meta?.showErrorNotification) {
				const notificationInfo = mutation.meta?.notification;

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

	const mergedQueryClientOptions = $derived(
		mergeRight(queryClientOptions ?? {}, {
			defaultOptions: {
				queries: {
					enabled: browser,
					retry: 0,
					refetchOnWindowFocus: false,
					staleTime: 1000 * 60 * 1 // 1 minute
				}
			}
		})
	);

	const queryClient = $derived(
		new QueryClient({
			mutationCache,
			queryCache,
			...mergedQueryClientOptions
		})
	);
</script>

<QueryClientProvider client={queryClient}>
	<DomainsHandlers>
		{@render children?.()}
	</DomainsHandlers>
</QueryClientProvider>

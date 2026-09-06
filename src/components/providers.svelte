<script lang="ts">
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import type { QueryClientConfig } from '@tanstack/svelte-query';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { mergeRight } from 'ramda';
	import { type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { matchesRepositoryChange, shouldInvalidate } from '$infrastructure/query-key-utils';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { createError } from '$utils/error-utils';

	/** Payload of the backend `repository-changed` event (serde camelCase). */
	interface RepositoryChangedPayload {
		repositoryId: string;
	}

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
					title: notificationInfo?.title ?? e.message,
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
					title: notificationInfo?.title ?? e.message,
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

	// App-global bridge: the backend filesystem watcher emits `repository-changed`
	// for ANY registered repository (not just the open one), so this lives here
	// rather than in a per-repo composable — it keeps the sidebar branch counts
	// live for repos that aren't currently open.
	$effect(() => {
		const client = queryClient;
		let unlisten: UnlistenFn | null = null;
		// `listen` resolves a turn later than the effect can be torn down. Without
		// this flag the cleanup below sees a null handle and the listener survives
		// the teardown — every re-run then stacks another one on the same event.
		let cancelled = false;
		listen<RepositoryChangedPayload>('repository-changed', (event) => {
			const { repositoryId } = event.payload;
			client.invalidateQueries({
				predicate: (query) => matchesRepositoryChange(query.queryKey, repositoryId)
			});
		})
			.then((fn) => {
				if (cancelled) {
					fn();
					return;
				}
				unlisten = fn;
			})
			.catch(() => {
				// Event bridge unavailable (e.g. non-Tauri context); nothing to do.
			});

		return () => {
			cancelled = true;
			unlisten?.();
		};
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children?.()}
</QueryClientProvider>

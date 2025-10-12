/**
 * Repository Add Handler
 *
 * Listens for repository add requests from the event bus
 * and orchestrates the repository creation flow.
 */

import type { QueryClient } from '@tanstack/svelte-query';
import { open } from '@tauri-apps/plugin-dialog';
import { notifications } from '$domains/notifications/store/notifications.svelte';
import { createCreateRepositoryMutation } from '$domains/repository-management/services/create-create-repository-mutation';
import { eventBus, Events } from '$services/event-bus';

export function setupAddRepositoryHandler(queryClient: QueryClient) {
	// Lazy-create mutation only when actually triggered
	let createRepositoryMutation: ReturnType<typeof createCreateRepositoryMutation> | null = null;

	const getMutation = () => {
		if (!createRepositoryMutation) {
			createRepositoryMutation = createCreateRepositoryMutation({
				onSuccess: (data) => {
					// Invalidate repositories query to refetch the list
					queryClient.invalidateQueries({ queryKey: ['listRepositories'] });

					if (data) {
						notifications.push({
							feedback: 'success',
							title: 'Repository added',
							message: `The repository ${data.name} was added successfully`
						});

						// Publish event that repository was added
						eventBus.publish(Events.REPOSITORY_ADDED, data);
					}
				},
				meta: {
					showErrorNotification: true
				}
			});
		}
		return createRepositoryMutation;
	};

	// Subscribe to add repository requests
	const subscription = eventBus.subscribe(Events.REPOSITORY_ADD_REQUESTED, async () => {
		try {
			const dir = await open({ directory: true, multiple: false });
			if (dir !== null) {
				getMutation().mutate({ path: dir });
			}
		} catch (error) {
			notifications.push({
				title: 'Error',
				message: error instanceof Error ? error.message : String(error),
				feedback: 'danger'
			});
		}
	});

	// Return cleanup function
	return () => {
		subscription.unsubscribe();
	};
}

/**
 * Repository Add Handler
 *
 * Listens for repository add requests from the event bus
 * and orchestrates the repository creation flow.
 */

import { open } from '@tauri-apps/plugin-dialog';
import { notifications } from '$domains/notifications/store/notifications.svelte';
import { createCreateRepositoryMutation } from '$domains/repository-management/logic/application/mutations/create-create-repository-mutation';
import { eventBus, Events } from '$services/event-bus';

export function setupAddRepositoryHandler() {
	const createRepositoryMutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			if (data) {
				// Publish event that repository was added
				eventBus.publish(Events.REPOSITORY_ADDED, data);
			}
		},
		meta: {
			showErrorNotification: true
		}
	});

	// Subscribe to add repository requests
	const subscription = eventBus.subscribe(Events.REPOSITORY_ADD_REQUESTED, async () => {
		try {
			const dir = await open({ directory: true, multiple: false });
			if (dir !== null) {
				createRepositoryMutation.mutate({ path: dir });
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

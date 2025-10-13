/**
 * Repository Add Handler
 *
 * Listens for repository add requests from the event bus
 * and orchestrates the repository creation flow.
 */

import { open } from '@tauri-apps/plugin-dialog';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { notifications } from '$domains/notifications/store/notifications.svelte';
import { createCreateRepositoryMutation } from '$domains/repository-management/logic/application/mutations/create-create-repository-mutation';
import { eventBus, Events } from '$services/event-bus';

export function setupAddRepositoryHandler() {
	const createRepositoryMutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			if (data) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${data.name} was added successfully`
				});

				// Publish event that repository was added
				eventBus.publish(Events.REPOSITORY_ADDED, data);

				goto(resolve(`/repos/${data.id}`));
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

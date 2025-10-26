/**
 * Repository Add Handler
 *
 * Listens for repository add requests from the event bus
 * and orchestrates the repository creation flow.
 */

import { open } from '@tauri-apps/plugin-dialog';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { createCreateRepositoryMutation } from '$domains/repository-management/core/composables/mutations/create-create-repository-mutation';
import { eventBus, Events } from '$services/event-bus';
import { notifications } from '$services/notifications/notifications.svelte';

export function setupAddRepositoryHandler() {
	const createRepositoryMutation = createCreateRepositoryMutation({
		onMutate: () => {
			// Publish event that repository is being added
			eventBus.publish(Events.REPOSITORY_ADDING);
		},
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
		onError: () => {
			// Publish event that repository add failed
			// Note: Error notification is already shown via meta.showErrorNotification
			eventBus.publish(Events.REPOSITORY_ADD_FAILED);
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
			} else {
				// User cancelled the dialog
				eventBus.publish(Events.REPOSITORY_ADD_FAILED);
			}
		} catch (error) {
			// Dialog API error
			eventBus.publish(Events.REPOSITORY_ADD_FAILED);
			notifications.push({
				title: 'Error',
				message: error instanceof Error ? error.message : String(error),
				feedback: 'danger'
			});
		}
	});

	// Return cleanup function and mutation state
	return {
		cleanup: () => {
			subscription.unsubscribe();
		},
		mutation: createRepositoryMutation
	};
}

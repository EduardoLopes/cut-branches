import { open } from '@tauri-apps/plugin-dialog';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { createCreateRepositoryMutation } from '$domains/repository-management/core/composables/mutations/create-create-repository-mutation';
import { notifications } from '$services/notifications/notifications.svelte';

export function useAddRepository() {
	const mutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			if (!data) return;
			notifications.push({
				feedback: 'success',
				title: 'Repository added',
				message: `The repository ${data.name} was added successfully`
			});
			goto(resolve(`/repos/${data.id}`));
		},
		meta: { showErrorNotification: true }
	});

	async function addRepository() {
		try {
			const dir = await open({ directory: true, multiple: false });
			if (dir !== null) {
				mutation.mutate({ path: dir });
			}
		} catch (error) {
			notifications.push({
				title: 'Error',
				message: error instanceof Error ? error.message : String(error),
				feedback: 'danger'
			});
		}
	}

	return {
		addRepository,
		get isPending() {
			return mutation.isPending;
		}
	};
}

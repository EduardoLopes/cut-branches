import { useQueryClient } from '@tanstack/svelte-query';
import { open } from '@tauri-apps/plugin-dialog';
import { createCreateRepositoryMutation } from '$domains/repository-management/infrastructure/mutations/create-create-repository-mutation';
import type { CreateRepositoryOutput } from '$infrastructure/bindings';
import { notifications } from '$services/notifications/notifications.svelte';

interface UseAddRepositoryOptions {
	/** Invoked with the created repository after a successful add. */
	onSuccess?: (data: CreateRepositoryOutput) => void;
}

/**
 * Application logic for adding a single repository via the native folder
 * picker. Shared by the plain add button and the split add/scan button so the
 * add flow (dialog → create mutation → success/error notification → list
 * invalidation) lives in exactly one place.
 */
export function useAddRepository(options: UseAddRepositoryOptions = {}) {
	const queryClient = useQueryClient();

	const mutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['getRepositoryList'] });

			if (data) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${data.name} was added successfully`
				});
				options.onSuccess?.(data);
			}
		},
		meta: {
			showErrorNotification: true
		}
	});

	/** Opens the folder picker and, if a folder is chosen, adds it. */
	function addFromDialog() {
		return open({ directory: true, multiple: false })
			.then((dir) => {
				if (dir !== null) {
					mutation.mutate({ path: dir });
				}
			})
			.catch((error) => {
				notifications.push({
					title: 'Error',
					message: error.message || String(error),
					feedback: 'danger'
				});
			});
	}

	return {
		get isPending() {
			return mutation.isPending;
		},
		addFromDialog
	};
}

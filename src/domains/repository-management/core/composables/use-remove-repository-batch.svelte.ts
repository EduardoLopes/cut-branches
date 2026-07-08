import { useQueryClient } from '@tanstack/svelte-query';
import { executeCommand } from '$infrastructure/tauri-commands';
import { notifications } from '$services/notifications/notifications.svelte';

interface UseRemoveRepositoryBatchOptions {
	/** Invoked after the batch finishes with the ids that were removed / failed. */
	onComplete?: (result: { removedIds: string[]; failedIds: string[] }) => void;
}

/**
 * Application logic for removing several repositories at once. It reuses the
 * single `deleteRepository` command per id — removals are sequential so a
 * failure on one repository never aborts the rest — then invalidates the
 * repository list once and reports a single summary notification.
 */
export function useRemoveRepositoryBatch(options: UseRemoveRepositoryBatchOptions = {}) {
	const queryClient = useQueryClient();

	let isPending = $state(false);

	function pluralize(count: number) {
		return count === 1 ? 'repository' : 'repositories';
	}

	async function removeBatch(ids: string[]) {
		if (isPending || ids.length === 0) {
			return;
		}

		isPending = true;

		const removedIds: string[] = [];
		const failedIds: string[] = [];

		try {
			for (const id of ids) {
				try {
					await executeCommand('deleteRepository', { id });
					removedIds.push(id);
					// Drop the removed repo's detail cache so nothing refetches a 404.
					queryClient.removeQueries({ queryKey: ['repository', 'getRepository', { id }] });
				} catch {
					failedIds.push(id);
				}
			}

			if (removedIds.length > 0) {
				await queryClient.invalidateQueries({ queryKey: ['repository', 'getRepositoryList'] });

				notifications.push({
					title: 'Repositories removed',
					message: `${removedIds.length} ${pluralize(removedIds.length)} removed`,
					feedback: 'success'
				});
			}

			if (failedIds.length > 0) {
				notifications.push({
					title: 'Some repositories could not be removed',
					message: `${failedIds.length} ${pluralize(failedIds.length)} failed to remove`,
					feedback: 'danger'
				});
			}

			options.onComplete?.({ removedIds, failedIds });
		} finally {
			isPending = false;
		}
	}

	return {
		get isPending() {
			return isPending;
		},
		removeBatch
	};
}

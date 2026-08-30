import { useQueryClient } from '@tanstack/svelte-query';
import { getResource, shouldInvalidate } from '$infrastructure/query-key-utils';
import { executeCommand } from '$infrastructure/tauri-commands';
import { notifications } from '$services/notifications/notifications.svelte';
import { getErrorMessage } from '$utils/error-utils';

/** A repository the batch should remove. The name is only used for reporting. */
export interface RemoveRepositoryTarget {
	id: string;
	name: string;
}

/** A removal that failed, with the reason the backend gave. */
export interface RemoveRepositoryFailure extends RemoveRepositoryTarget {
	message: string;
}

interface UseRemoveRepositoryBatchOptions {
	/** Invoked after the batch finishes with the ids that were removed / failed. */
	onComplete?: (result: {
		removedIds: string[];
		failedIds: string[];
		failures: RemoveRepositoryFailure[];
	}) => void;
}

/**
 * Application logic for removing several repositories at once. It reuses the
 * single `deleteRepository` command per id — removals are sequential so a
 * failure on one repository never aborts the rest — then invalidates the
 * caches and reports a single summary notification.
 */
export function useRemoveRepositoryBatch(options: UseRemoveRepositoryBatchOptions = {}) {
	const queryClient = useQueryClient();

	let isPending = $state(false);

	function pluralize(count: number) {
		return count === 1 ? 'repository' : 'repositories';
	}

	/**
	 * Invalidates everything a single `deleteRepository` mutation would.
	 *
	 * The batch calls the command directly rather than through the mutation, so
	 * it misses the global `MutationCache.onSuccess` hook — replaying the same
	 * `RESOURCE_MAPPINGS` lookup here keeps the branch lists, metrics and diff
	 * caches of the removed repositories from lingering.
	 */
	function invalidateRemovedResources() {
		const resource = getResource('deleteRepository');
		const resources = Array.isArray(resource) ? resource : [resource];

		return Promise.all(
			resources.map((name) =>
				queryClient.invalidateQueries({
					predicate: (query) => shouldInvalidate(query.queryKey, [name])
				})
			)
		);
	}

	async function removeBatch(targets: RemoveRepositoryTarget[]) {
		if (isPending || targets.length === 0) {
			return;
		}

		isPending = true;

		const removedIds: string[] = [];
		const failures: RemoveRepositoryFailure[] = [];

		try {
			for (const target of targets) {
				try {
					await executeCommand('deleteRepository', { id: target.id });
					removedIds.push(target.id);
					// Drop the removed repo's detail cache so nothing refetches a 404.
					queryClient.removeQueries({
						queryKey: ['repository', 'getRepository', { id: target.id }]
					});
				} catch (error) {
					// Keep the reason: a bare count tells the user nothing about why a
					// repository stayed in the list.
					failures.push({ ...target, message: getErrorMessage(error) });
				}
			}

			if (removedIds.length > 0) {
				await invalidateRemovedResources();

				notifications.push({
					title: 'Repositories removed',
					message: `${removedIds.length} ${pluralize(removedIds.length)} removed`,
					feedback: 'success'
				});
			}

			if (failures.length > 0) {
				notifications.push({
					title: 'Some repositories could not be removed',
					message:
						`${failures.length} ${pluralize(failures.length)} could not be removed:\n\n` +
						failures.map((failure) => `- \`${failure.name}\` — ${failure.message}`).join('\n'),
					feedback: 'danger'
				});
			}

			options.onComplete?.({
				removedIds,
				failedIds: failures.map((failure) => failure.id),
				failures
			});
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

/**
 * Repository Deleted Handler
 *
 * Listens for repository deletion events from the event bus
 * and cleans up branch-related data for the deleted repository.
 */

import { createClearLockedBranchesMutation } from './create-clear-locked-branches-mutation';
import { createSetBranchSelectionAllMutation } from './create-set-branch-selection-all-mutation';
import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
import { eventBus, Events } from '$services/event-bus';

export function setupRepositoryDeletedHandler() {
	const setSelectionAllMutation = createSetBranchSelectionAllMutation();
	const clearLockedMutation = createClearLockedBranchesMutation();

	// Subscribe to repository deletion events
	const subscription = eventBus.subscribe<{ id: string; repoId: string }>(
		Events.REPOSITORY_DELETED,
		(data) => {
			if (!data?.repoId) return;

			const { repoId } = data;

			// Clear search state
			const search = getSearchBranchesStore(repoId);
			search?.clear();

			// Clear branch selections for this repository
			// Note: These mutations might be redundant due to CASCADE delete in DB,
			// but we call them explicitly to be defensive and ensure UI state is cleared
			setSelectionAllMutation.mutate({ repoId, isSelected: false, deletionStatus: 'all' });

			// Clear locked branches for this repository
			clearLockedMutation.mutate({ repoId });
		}
	);

	// Return cleanup function
	return {
		cleanup: () => {
			subscription.unsubscribe();
		}
	};
}

import { useQueryClient } from '@tanstack/svelte-query';
import { patchBranchSelectionCaches } from '../../utils/patch-branch-selection-caches';
import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createUpdateBranchSelectionBatchMutation(
	options?: TauriMutationOptions<'updateBranchSelectionBatch'>
) {
	const queryClient = useQueryClient();

	return createTauriMutation('updateBranchSelectionBatch', {
		...options,
		// Selection is client-predictable: patch the cached branch lists in
		// place instead of invalidating the whole `branch` resource (which
		// refetched the full payload for every observer — the freeze on large
		// repositories).
		onSuccess: (data, variables, onMutateResult, context) => {
			patchBranchSelectionCaches(queryClient, variables.repoId, {
				type: 'batch',
				branchNames: variables.branchNames,
				isSelected: variables.isSelected
			});
			return options?.onSuccess?.(data, variables, onMutateResult, context);
		}
	});
}

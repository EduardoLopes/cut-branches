import { useQueryClient } from '@tanstack/svelte-query';
import { patchBranchSelectionCaches } from '../../utils/patch-branch-selection-caches';
import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createSetBranchSelectionAllMutation(
	options?: TauriMutationOptions<'setBranchSelectionAll'>
) {
	const queryClient = useQueryClient();

	return createTauriMutation('setBranchSelectionAll', {
		...options,
		// Same strategy as the batch mutation: the select-all outcome is fully
		// determined by the input flags, so the cached lists are patched in
		// place rather than refetched wholesale.
		onSuccess: (data, variables, onMutateResult, context) => {
			patchBranchSelectionCaches(queryClient, variables.repoId, {
				type: 'all',
				isSelected: variables.isSelected,
				deletionStatus: variables.deletionStatus,
				// Mirror the Rust-side serde defaults (both true when omitted).
				excludeLocked: variables.excludeLocked ?? true,
				excludeCurrent: variables.excludeCurrent ?? true
			});
			return options?.onSuccess?.(data, variables, onMutateResult, context);
		}
	});
}

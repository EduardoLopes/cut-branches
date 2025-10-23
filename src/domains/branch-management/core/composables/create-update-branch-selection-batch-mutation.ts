import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createUpdateBranchSelectionBatchMutation(
	options?: TauriMutationOptions<'updateBranchSelectionBatch'>
) {
	return createTauriMutation('updateBranchSelectionBatch', options);
}

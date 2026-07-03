import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createUpdateBranchSelectionBatchMutation(
	options?: TauriMutationOptions<'updateBranchSelectionBatch'>
) {
	return createTauriMutation('updateBranchSelectionBatch', options);
}

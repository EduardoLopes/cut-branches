import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createAddSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateSelectedBranches'>
) {
	return createTauriMutation('batchCreateSelectedBranches', options);
}

export function createRemoveSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteSelectedBranches'>
) {
	return createTauriMutation('batchDeleteSelectedBranches', options);
}

export function createClearSelectedBranchesMutation(
	options?: TauriMutationOptions<'deleteAllSelectedBranches'>
) {
	return createTauriMutation('deleteAllSelectedBranches', options);
}

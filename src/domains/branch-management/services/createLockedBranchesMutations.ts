import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createAddLockedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateLockedBranches'>
) {
	return createTauriMutation('batchCreateLockedBranches', options);
}

export function createRemoveLockedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteLockedBranches'>
) {
	return createTauriMutation('batchDeleteLockedBranches', options);
}

export function createClearLockedBranchesMutation(
	options?: TauriMutationOptions<'deleteAllLockedBranches'>
) {
	return createTauriMutation('deleteAllLockedBranches', options);
}

import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createAddLockedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateLockedBranches'>
) {
	return createTauriMutation('batchCreateLockedBranches', options);
}

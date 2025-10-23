import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createClearLockedBranchesMutation(
	options?: TauriMutationOptions<'deleteAllLockedBranches'>
) {
	return createTauriMutation('deleteAllLockedBranches', options);
}

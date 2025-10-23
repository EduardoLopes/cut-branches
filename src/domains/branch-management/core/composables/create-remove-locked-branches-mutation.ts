import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createRemoveLockedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteLockedBranches'>
) {
	return createTauriMutation('batchDeleteLockedBranches', options);
}

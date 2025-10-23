import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

type BatchDeleteBranchesMutationOptions = TauriMutationOptions<'batchDeleteBranches'>;

export function createDeleteBranchesMutation(options?: BatchDeleteBranchesMutationOptions) {
	return createTauriMutation('batchDeleteBranches', options);
}

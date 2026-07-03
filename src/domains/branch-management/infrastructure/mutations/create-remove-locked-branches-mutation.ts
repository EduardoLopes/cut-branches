import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createRemoveLockedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteLockedBranches'>
) {
	return createTauriMutation('batchDeleteLockedBranches', options);
}

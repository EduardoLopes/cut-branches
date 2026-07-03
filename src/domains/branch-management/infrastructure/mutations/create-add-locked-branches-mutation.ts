import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createAddLockedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateLockedBranches'>
) {
	return createTauriMutation('batchCreateLockedBranches', options);
}

import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

export function createSetBranchSelectionAllMutation(
	options?: TauriMutationOptions<'setBranchSelectionAll'>
) {
	return createTauriMutation('setBranchSelectionAll', options);
}

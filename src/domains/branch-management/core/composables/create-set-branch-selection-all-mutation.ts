import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createSetBranchSelectionAllMutation(
	options?: TauriMutationOptions<'setBranchSelectionAll'>
) {
	return createTauriMutation('setBranchSelectionAll', options);
}

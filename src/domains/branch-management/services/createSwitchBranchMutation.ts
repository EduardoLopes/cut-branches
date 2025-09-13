import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

export function createSwitchBranchMutation(options?: TauriMutationOptions<'switchBranch'>) {
	return createTauriMutation('switchBranch', {
		...options
	});
}

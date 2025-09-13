import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

type RestoreBranchMutationOptions = TauriMutationOptions<'restoreBranch'>;
type RestoreBranchesMutationOptions = TauriMutationOptions<'restoreBranches'>;

export function createRestoreDeletedBranchMutation(options?: RestoreBranchMutationOptions) {
	return createTauriMutation('restoreBranch', {
		...options
	});
}

export function createRestoreDeletedBranchesMutation(options?: RestoreBranchesMutationOptions) {
	return createTauriMutation('restoreBranches', {
		...options
	});
}

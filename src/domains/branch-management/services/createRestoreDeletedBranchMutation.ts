import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

type CreateBranchRestorationMutationOptions = TauriMutationOptions<'createBranchRestoration'>;
type BatchCreateBranchRestorationsMutationOptions =
	TauriMutationOptions<'batchCreateBranchRestorations'>;

export function createRestoreDeletedBranchMutation(
	options?: CreateBranchRestorationMutationOptions
) {
	return createTauriMutation('createBranchRestoration', options);
}

export function createRestoreDeletedBranchesMutation(
	options?: BatchCreateBranchRestorationsMutationOptions
) {
	return createTauriMutation('batchCreateBranchRestorations', options);
}

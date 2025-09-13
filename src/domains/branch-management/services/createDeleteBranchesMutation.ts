import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

type DeleteBranchesMutationOptions = TauriMutationOptions<'deleteBranches'>;

export function createDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createTauriMutation('deleteBranches', {
		...options
	});
}

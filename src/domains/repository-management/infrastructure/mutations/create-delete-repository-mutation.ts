import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

type DeleteRepositoryMutationOptions = TauriMutationOptions<'deleteRepository'>;

export function createDeleteRepositoryMutation(options?: DeleteRepositoryMutationOptions) {
	return createTauriMutation('deleteRepository', options);
}

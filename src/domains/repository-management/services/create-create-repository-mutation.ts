import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

type CreateRepositoryMutationOptions = TauriMutationOptions<'createRepository'>;

export function createCreateRepositoryMutation(options?: CreateRepositoryMutationOptions) {
	return createTauriMutation('createRepository', options);
}

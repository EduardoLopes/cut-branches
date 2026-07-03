import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

type CreateRepositoryMutationOptions = TauriMutationOptions<'createRepository'>;

export function createCreateRepositoryMutation(options?: CreateRepositoryMutationOptions) {
	return createTauriMutation('createRepository', options);
}

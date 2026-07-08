import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for the destructive cleanup command. The backend
 * re-validates every target; this is just the transport.
 */
export function createCleanRepositoryMutation(options?: TauriMutationOptions<'cleanRepository'>) {
	return createTauriMutation('cleanRepository', { ...options });
}

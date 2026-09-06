import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2): remove a worktree. Invalidation of the worktree
 * list is wired via `RESOURCE_MAPPINGS` for `removeWorktree`.
 */
export function createRemoveWorktreeMutation(options?: TauriMutationOptions<'removeWorktree'>) {
	return createTauriMutation('removeWorktree', { ...options });
}

import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2): create a worktree. Invalidation of the worktree
 * (and branch) list is wired via `RESOURCE_MAPPINGS` for `addWorktree`.
 */
export function createAddWorktreeMutation(options?: TauriMutationOptions<'addWorktree'>) {
	return createTauriMutation('addWorktree', { ...options });
}

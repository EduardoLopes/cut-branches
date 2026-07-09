import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2): lock a worktree. Invalidation of the worktree
 * list is wired via `RESOURCE_MAPPINGS` for `lockWorktree`.
 */
export function createLockWorktreeMutation(options?: TauriMutationOptions<'lockWorktree'>) {
	return createTauriMutation('lockWorktree', { ...options });
}

/**
 * Server-state adapter (§1.2): unlock a worktree. Invalidation of the worktree
 * list is wired via `RESOURCE_MAPPINGS` for `unlockWorktree`.
 */
export function createUnlockWorktreeMutation(options?: TauriMutationOptions<'unlockWorktree'>) {
	return createTauriMutation('unlockWorktree', { ...options });
}

import {
	createLockWorktreeMutation,
	createUnlockWorktreeMutation
} from '../../infrastructure/mutations/create-lock-worktree-mutation';
import { createRemoveWorktreeMutation } from '../../infrastructure/mutations/create-remove-worktree-mutation';
import { notifications } from '$services/notifications/notifications.svelte';

interface UseWorktreeActionsProps {
	/** Reactive getter for the repository's working-directory path. */
	getPath: () => string;
}

/**
 * Application logic for the per-worktree actions (remove, lock, unlock). Each
 * action wraps its mutation with a success/error toast; the worktree list
 * refreshes automatically via resource-based invalidation (§1.2).
 */
export function useWorktreeActions({ getPath }: UseWorktreeActionsProps) {
	const removeMutation = createRemoveWorktreeMutation();
	const lockMutation = createLockWorktreeMutation();
	const unlockMutation = createUnlockWorktreeMutation();

	/**
	 * Removes several worktrees, optionally forcing locked ones. Runs them
	 * sequentially and reports a single summary toast (mirrors bulk branch
	 * deletion). Returns how many succeeded/failed.
	 */
	async function removeMany(names: string[], force = false) {
		let ok = 0;
		const failed: string[] = [];
		for (const name of names) {
			try {
				await removeMutation.mutateAsync({ path: getPath(), name, force });
				ok += 1;
			} catch {
				failed.push(name);
			}
		}

		if (ok > 0) {
			notifications.push({
				feedback: failed.length > 0 ? 'warning' : 'success',
				title: `Deleted ${ok} worktree${ok === 1 ? '' : 's'}`,
				message: failed.length > 0 ? `${failed.length} could not be deleted` : ''
			});
		} else if (failed.length > 0) {
			notifications.push({
				feedback: 'danger',
				title: 'Could not delete worktrees',
				message: `None of the ${failed.length} selected worktrees could be deleted`
			});
		}

		return { ok, failed };
	}

	/** Removes a worktree, optionally forcing removal of a locked one. */
	async function remove(name: string, force = false) {
		try {
			await removeMutation.mutateAsync({ path: getPath(), name, force });
			notifications.push({
				feedback: 'success',
				title: 'Worktree removed',
				message: `Removed worktree **${name}**.`
			});
		} catch (error) {
			notifications.push({
				feedback: 'danger',
				title: `Error removing worktree ${name}`,
				message: (error as { message?: string })?.message ?? String(error)
			});
			throw error;
		}
	}

	/** Locks a worktree, optionally recording a reason. */
	async function lock(name: string, reason?: string) {
		try {
			await lockMutation.mutateAsync({ path: getPath(), name, reason: reason ?? null });
			notifications.push({
				feedback: 'success',
				title: 'Worktree locked',
				message: `Locked worktree **${name}**.`
			});
		} catch (error) {
			notifications.push({
				feedback: 'danger',
				title: `Error locking worktree ${name}`,
				message: (error as { message?: string })?.message ?? String(error)
			});
		}
	}

	/** Unlocks a worktree. */
	async function unlock(name: string) {
		try {
			await unlockMutation.mutateAsync({ path: getPath(), name });
			notifications.push({
				feedback: 'success',
				title: 'Worktree unlocked',
				message: `Unlocked worktree **${name}**.`
			});
		} catch (error) {
			notifications.push({
				feedback: 'danger',
				title: `Error unlocking worktree ${name}`,
				message: (error as { message?: string })?.message ?? String(error)
			});
		}
	}

	return {
		get isRemoving() {
			return removeMutation.isPending;
		},
		get isLocking() {
			return lockMutation.isPending;
		},
		get isUnlocking() {
			return unlockMutation.isPending;
		},
		remove,
		removeMany,
		lock,
		unlock
	};
}

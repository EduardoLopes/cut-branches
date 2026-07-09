import { open } from '@tauri-apps/plugin-dialog';
import { createAddWorktreeMutation } from '../../infrastructure/mutations/create-add-worktree-mutation';
import { notifications } from '$services/notifications/notifications.svelte';

interface UseAddWorktreeFlowProps {
	/** Reactive getter for the repository's working-directory path. */
	getPath: () => string;
}

interface AddWorktreeArgs {
	/** Administrative name for the new worktree; also the new branch name when no reference is given. */
	name: string;
	/** Existing local branch to check out, or empty/undefined to create a new branch. */
	reference?: string;
	/** Lock the worktree immediately after creating it. */
	lock?: boolean;
}

/** Strips a trailing path separator so the child path joins cleanly. */
function joinPath(parent: string, child: string): string {
	return `${parent.replace(/[/\\]+$/, '')}/${child}`;
}

/**
 * Application logic for creating a worktree: pick a parent directory via the
 * native dialog, then create the worktree under it. Owns the picked directory
 * and the add mutation; the consuming component owns the form inputs (§1.2).
 */
export function useAddWorktreeFlow({ getPath }: UseAddWorktreeFlowProps) {
	const addMutation = createAddWorktreeMutation();

	let selectedParent = $state<string | null>(null);

	/** Opens the native folder picker for the new worktree's parent directory. */
	async function pickDirectory(): Promise<void> {
		try {
			const dir = await open({ directory: true, multiple: false });
			if (typeof dir === 'string') {
				selectedParent = dir;
			}
		} catch (error) {
			notifications.push({
				feedback: 'danger',
				title: 'Error choosing directory',
				message: (error as { message?: string })?.message ?? String(error)
			});
		}
	}

	/** Clears the picked directory. */
	function reset(): void {
		selectedParent = null;
	}

	/**
	 * Creates the worktree at `<selectedParent>/<name>`. Returns `true` on
	 * success so the caller can close its modal.
	 */
	async function add({ name, reference, lock = false }: AddWorktreeArgs): Promise<boolean> {
		const parent = selectedParent;
		const trimmedName = name.trim();
		if (!parent || !trimmedName) {
			return false;
		}

		const worktreePath = joinPath(parent, trimmedName);
		const trimmedReference = reference?.trim();

		try {
			await addMutation.mutateAsync({
				path: getPath(),
				name: trimmedName,
				worktreePath,
				reference: trimmedReference ? trimmedReference : null,
				lock
			});
			notifications.push({
				feedback: 'success',
				title: 'Worktree added',
				message: `Created worktree **${trimmedName}** at ${worktreePath}.`
			});
			reset();
			return true;
		} catch (error) {
			notifications.push({
				feedback: 'danger',
				title: `Error creating worktree ${trimmedName}`,
				message: (error as { message?: string })?.message ?? String(error)
			});
			return false;
		}
	}

	return {
		get selectedParent() {
			return selectedParent;
		},
		get isAdding() {
			return addMutation.isPending;
		},
		pickDirectory,
		reset,
		add
	};
}

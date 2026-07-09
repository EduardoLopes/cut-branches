import { createListWorktreesQuery } from '../../infrastructure/queries/create-list-worktrees-query';
import { type Worktree } from '../models/worktree';
import type { AppError } from '$infrastructure/bindings';

interface UseWorktreesViewProps {
	/** Reactive getter for the repository's working-directory path. */
	getPath: () => string;
}

/**
 * Application logic for the worktrees view: reads the worktree list for a
 * repository and exposes UI-shaped state. The query is disabled until a path is
 * available (§1.2).
 */
export function useWorktreesView({ getPath }: UseWorktreesViewProps) {
	const worktreesQuery = createListWorktreesQuery(() => ({ path: getPath() }), {
		meta: { showErrorNotification: true }
	});

	const worktrees = $derived<Worktree[]>(worktreesQuery.data?.worktrees ?? []);
	const linkedCount = $derived(worktrees.filter((w) => !w.isMain()).length);
	const isLoading = $derived(worktreesQuery.isLoading);
	const isError = $derived(worktreesQuery.isError);
	const error = $derived<AppError | null>(worktreesQuery.error ?? null);

	return {
		get worktrees() {
			return worktrees;
		},
		get linkedCount() {
			return linkedCount;
		},
		get isLoading() {
			return isLoading;
		},
		get isError() {
			return isError;
		},
		get error() {
			return error;
		}
	};
}

/**
 * Shared, persisted ordering for the repository navigation list.
 *
 * This is a cross-domain seam (§1.5): the `repository-management` add-repository
 * menu writes the chosen order, and the `repository-navigation` sidebar reads it
 * to order the list — without either domain importing the other. It lives in
 * `$lib` because it is globally-shared, stateful, framework-dependent logic.
 */

import { getLocalStorage } from '$utils/get-local-storage';
import { setLocalStorage } from '$utils/set-local-storage';

/** How the repository navigation list is ordered. */
export type RepositorySortMode = 'name-asc' | 'name-desc' | 'branches-desc' | 'branches-asc';

/** The default order applied when no preference has been stored yet. */
export const DEFAULT_REPOSITORY_SORT: RepositorySortMode = 'name-asc';

/** The user-facing sort choices, in the order they appear in the menu. */
export const REPOSITORY_SORT_OPTIONS: { id: RepositorySortMode; label: string }[] = [
	{ id: 'name-asc', label: 'Name (A–Z)' },
	{ id: 'name-desc', label: 'Name (Z–A)' },
	{ id: 'branches-desc', label: 'Most branches' },
	{ id: 'branches-asc', label: 'Fewest branches' }
];

/** Narrows an arbitrary persisted value to a known sort mode. */
export function isRepositorySortMode(value: unknown): value is RepositorySortMode {
	return REPOSITORY_SORT_OPTIONS.some((option) => option.id === value);
}

/** The minimal shape needed to order repositories in the navigation list. */
interface SortableRepository {
	name: string;
	branchesCount: number;
}

/**
 * Returns a new array of repositories ordered by the given sort mode. Branch
 * counts tie-break on name so the order is stable and predictable.
 */
export function sortRepositories<T extends SortableRepository>(
	repositories: readonly T[],
	mode: RepositorySortMode
): T[] {
	const sorted = [...repositories];

	switch (mode) {
		case 'name-desc':
			return sorted.sort((a, b) => b.name.localeCompare(a.name));
		case 'branches-desc':
			return sorted.sort(
				(a, b) => b.branchesCount - a.branchesCount || a.name.localeCompare(b.name)
			);
		case 'branches-asc':
			return sorted.sort(
				(a, b) => a.branchesCount - b.branchesCount || a.name.localeCompare(b.name)
			);
		case 'name-asc':
		default:
			return sorted.sort((a, b) => a.name.localeCompare(b.name));
	}
}

const STORAGE_KEY = 'repository-nav-sort';

/** Reads the persisted sort mode, falling back to the default when absent or invalid. */
export function readPersistedSort(): RepositorySortMode {
	const stored = getLocalStorage<RepositorySortMode>(STORAGE_KEY);
	return isRepositorySortMode(stored) ? stored : DEFAULT_REPOSITORY_SORT;
}

let mode = $state<RepositorySortMode>(readPersistedSort());

export const repositorySort = {
	/** The currently selected sort mode. */
	get mode(): RepositorySortMode {
		return mode;
	},
	/** Select a new sort mode and persist it across sessions. */
	setMode(next: RepositorySortMode) {
		mode = next;
		setLocalStorage(STORAGE_KEY, next);
	}
};

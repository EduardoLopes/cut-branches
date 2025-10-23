import type { Branch } from '$lib/bindings';
import { ensureString } from '$utils/string-utils';

/**
 * Filters branches by search term
 *
 * @param branches - Array of branches to filter
 * @param searchTerm - Search term to filter by (case-insensitive)
 * @returns Filtered array of branches
 */
export function filterBranchesBySearch(branches: Branch[], searchTerm?: string): Branch[] {
	const normalizedSearchTerm = ensureString(searchTerm).toLowerCase().trim();

	if (!normalizedSearchTerm) {
		return branches;
	}

	return branches.filter((branch: Branch) =>
		branch.name.toLowerCase().trim().includes(normalizedSearchTerm)
	);
}

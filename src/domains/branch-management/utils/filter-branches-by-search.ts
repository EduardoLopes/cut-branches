import { type Branch } from '$domains/branch-management/core/models/branch';
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
		branch.getName().toLowerCase().trim().includes(normalizedSearchTerm)
	);
}

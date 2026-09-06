/**
 * Branch filtering utilities for selection
 */

import { type Branch } from '$domains/branch-management/core/models/branch';

export interface FilterSelectableBranchesParams {
	branches: Branch[];
	currentBranch?: string;
	searchQuery?: string;
}

/**
 * Filters branches to show only selectable ones
 * Excludes current branch, locked branches, and applies search filtering
 */
export function filterSelectableBranches({
	branches,
	currentBranch,
	searchQuery
}: FilterSelectableBranchesParams): Branch[] {
	const trimmedSearch = (searchQuery ?? '').trim().toLowerCase();

	return branches.filter((branch) => {
		// Must not be current branch and must not be locked
		const isSelectable = branch.getName() !== currentBranch && !branch.getIsLocked();
		if (!isSelectable) return false;

		// If no search term, show all selectable
		if (!trimmedSearch) return true;

		// Filter by search term
		return branch.getName().toLowerCase().includes(trimmedSearch);
	});
}

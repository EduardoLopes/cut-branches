import type { BranchFilters, GetBranchListInput } from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

/**
 * Creates a query for fetching a list of branches from a repository
 *
 * @param input - Function that returns the input parameters including repoId and optional filters
 * @param options - Optional query configuration options
 * @returns A Tauri query instance for fetching branches
 */
export function getBranchListQuery(
	input: () => GetBranchListInput,
	options?: TauriQueryOptions<'getBranchList'>
) {
	return createTauriQuery('getBranchList', {
		input,
		enabled: () => !!input().repoId,
		...options
	});
}

/**
 * Helper to create filter configuration for active (non-deleted) branches
 *
 * @returns BranchFilters configured to show only active branches
 */
export function createActiveBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'active'
	};
}

/**
 * Helper to create filter configuration for deleted branches
 *
 * @returns BranchFilters configured to show only deleted branches
 */
export function createDeletedBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'deleted'
	};
}

/**
 * Helper to create filter configuration for all branches (active + deleted)
 *
 * @returns BranchFilters configured to show all branches
 */
export function createAllBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'all'
	};
}

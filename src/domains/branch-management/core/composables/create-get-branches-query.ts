import type { BranchFilters, GetBranchListInput } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetBranchesQuery(
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
 * Helper to create default filter for active (non-deleted) branches
 */
export function createActiveBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'active'
	};
}

/**
 * Helper to create filter for deleted branches
 */
export function createDeletedBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'deleted'
	};
}

/**
 * Helper to create filter for all branches (active + deleted)
 */
export function createAllBranchesFilter(): BranchFilters {
	return {
		deletionStatus: 'all'
	};
}

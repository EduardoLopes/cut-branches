import type { BranchFilters, DeletionStatusFilter } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

type ListBranchesQueryOptions = TauriQueryOptions<'listBranches'>;

/**
 * @deprecated Use createGetBranchesQuery instead for better filter support
 */
export function createListBranchesQuery(
	repoId: string,
	includeDeleted: boolean = false,
	options?: ListBranchesQueryOptions
) {
	// Map old boolean parameter to new filter system
	const deletionStatus: DeletionStatusFilter = includeDeleted ? 'deleted' : 'active';

	return createTauriQuery('listBranches', {
		input: { repoId, filters: { deletionStatus } },
		...options
	});
}

/**
 * Create a query to list branches with filters
 */
export function createListBranchesQueryWithFilters(
	repoId: string,
	filters?: BranchFilters,
	options?: ListBranchesQueryOptions
) {
	return createTauriQuery('listBranches', {
		input: { repoId, filters },
		...options
	});
}

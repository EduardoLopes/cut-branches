import type { BranchFilters, DeletionStatusFilter } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

type GetBranchListQueryOptions = TauriQueryOptions<'getBranchList'>;

/**
 * @deprecated Use createGetBranchesQuery instead for better filter support
 */
export function createListBranchesQuery(
	repoId: string,
	includeDeleted: boolean = false,
	options?: GetBranchListQueryOptions
) {
	// Map old boolean parameter to new filter system
	const deletionStatus: DeletionStatusFilter = includeDeleted ? 'deleted' : 'active';

	return createTauriQuery('getBranchList', {
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
	options?: GetBranchListQueryOptions
) {
	return createTauriQuery('getBranchList', {
		input: { repoId, filters },
		...options
	});
}

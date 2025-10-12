import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

type ListBranchesQueryOptions = TauriQueryOptions<'listBranches'>;

export function createListBranchesQuery(
	repoId: string,
	includeDeleted: boolean = false,
	options?: ListBranchesQueryOptions
) {
	return createTauriQuery('listBranches', {
		input: { repoId, includeDeleted },
		...options
	});
}

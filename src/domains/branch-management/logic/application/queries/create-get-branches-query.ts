import type { ListBranchesInput } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetBranchesQuery(
	input: ListBranchesInput,
	options?: TauriQueryOptions<'listBranches'>
) {
	return createTauriQuery('listBranches', {
		input,
		enabled: !!input.repoId,
		...options
	});
}

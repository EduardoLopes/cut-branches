import type { GetBranchListInput } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetBranchesQuery(
	input: () => GetBranchListInput,
	options?: TauriQueryOptions<'getBranchList'>
) {
	return createTauriQuery('getBranchList', {
		input: () => input(),
		enabled: !!input().repoId,
		...options
	});
}

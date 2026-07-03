import type { GetBranchListInput } from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

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

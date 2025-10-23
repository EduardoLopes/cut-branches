import { type CreateQueryOptions } from '@tanstack/svelte-query';
import { type AppError, type GetBranchListInput, type GetBranchListOutput } from '$lib/bindings';
import { createTauriQuery } from '$utils/create-tauri-query';

export function createListBranchesQuery(
	input: GetBranchListInput,
	options?: Omit<CreateQueryOptions<GetBranchListOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('getBranchList', {
		input,
		enabled: !!input.repoId,
		...options
	});
}

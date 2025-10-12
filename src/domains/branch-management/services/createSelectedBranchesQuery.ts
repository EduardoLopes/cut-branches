import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListSelectedBranchesInput,
	type ListSelectedBranchesOutput
} from '$lib/bindings';
import { createTauriQuery } from '$utils/create-tauri-query';

export function createSelectedBranchesQuery(
	input: ListSelectedBranchesInput,
	options?: Omit<CreateQueryOptions<ListSelectedBranchesOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('listSelectedBranches', {
		input: () => input,
		enabled: !!input.repoId,
		...options
	});
}

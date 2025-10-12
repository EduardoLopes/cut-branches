import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListLockedBranchesInput,
	type ListLockedBranchesOutput
} from '$lib/bindings';
import { createTauriQuery } from '$utils/create-tauri-query';

export function createLockedBranchesQuery(
	input: ListLockedBranchesInput,
	options?: Omit<CreateQueryOptions<ListLockedBranchesOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('listLockedBranches', {
		input,
		enabled: !!input.repoId,
		...options
	});
}

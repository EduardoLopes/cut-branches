import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListBranchSelectionInput,
	type ListBranchSelectionOutput
} from '$infrastructure/bindings';
import { createTauriQuery } from '$infrastructure/create-tauri-query';

export function createSelectedBranchesQuery(
	input: ListBranchSelectionInput,
	options?: Omit<CreateQueryOptions<ListBranchSelectionOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('listBranchSelection', {
		input,
		enabled: !!input.repoId,
		...options
	});
}

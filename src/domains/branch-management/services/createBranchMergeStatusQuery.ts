import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type GetBranchMergeStatusInput,
	type GetBranchMergeStatusOutput
} from '$lib/bindings';
import { createTauriQuery } from '$utils/create-tauri-query';

export function createBranchMergeStatusQuery(
	input: GetBranchMergeStatusInput,
	options?: Omit<CreateQueryOptions<GetBranchMergeStatusOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('getBranchMergeStatus', {
		input,
		enabled: !!input.path && !!input.branchName,
		...options
	});
}

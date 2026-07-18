import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type GetBranchDiffStatsInput,
	type GetBranchDiffStatsOutput
} from '$infrastructure/bindings';
import { createTauriQuery } from '$infrastructure/create-tauri-query';

export function createBranchDiffStatsQuery(
	input: GetBranchDiffStatsInput,
	options?: Omit<CreateQueryOptions<GetBranchDiffStatsOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('getBranchDiffStats', {
		input,
		enabled: !!input.path && !!input.branchName,
		...options
	});
}

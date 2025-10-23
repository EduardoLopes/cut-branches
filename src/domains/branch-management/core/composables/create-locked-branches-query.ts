import { type CreateQueryOptions } from '@tanstack/svelte-query';
import { type AppError, type ListLockedBranchesOutput } from '$lib/bindings';
import { createTauriQuery, type InputResolver } from '$utils/create-tauri-query';

export function createLockedBranchesQuery(
	input: InputResolver<'listLockedBranches'>,
	options?: Omit<CreateQueryOptions<ListLockedBranchesOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	const resolveInput = () => (typeof input === 'function' ? input() : input);

	return createTauriQuery('listLockedBranches', {
		input,
		enabled: () => !!resolveInput().repoId,
		...options
	});
}

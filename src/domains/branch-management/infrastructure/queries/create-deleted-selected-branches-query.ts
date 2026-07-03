import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListDeletedBranchSelectionInput,
	type ListDeletedBranchSelectionOutput
} from '$infrastructure/bindings';
import { createTauriQuery } from '$infrastructure/create-tauri-query';

export function createDeletedSelectedBranchesQuery(
	input: ListDeletedBranchSelectionInput,
	options?: Omit<
		CreateQueryOptions<ListDeletedBranchSelectionOutput, AppError>,
		'queryKey' | 'queryFn'
	>
) {
	return createTauriQuery('listDeletedBranchSelection', {
		input,
		enabled: !!input.repoId,
		...options
	});
}

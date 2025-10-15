import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListBranchSelectionInput,
	type ListBranchSelectionOutput,
	type ListDeletedBranchSelectionInput,
	type ListDeletedBranchSelectionOutput
} from '$lib/bindings';
import { createTauriQuery } from '$utils/create-tauri-query';

// Active branches query

export function createSelectedBranchesQuery(
	input: () => ListBranchSelectionInput,
	options?: Omit<CreateQueryOptions<ListBranchSelectionOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	return createTauriQuery('listBranchSelection', {
		input,
		enabled: () => !!input().repoId,
		...options
	});
}

// Deleted branches (restoration) query

export function createDeletedSelectedBranchesQuery(
	input: () => ListDeletedBranchSelectionInput,
	options?: Omit<
		CreateQueryOptions<ListDeletedBranchSelectionOutput, AppError>,
		'queryKey' | 'queryFn'
	>
) {
	return createTauriQuery('listDeletedBranchSelection', {
		input,
		enabled: () => !!input().repoId,
		...options
	});
}

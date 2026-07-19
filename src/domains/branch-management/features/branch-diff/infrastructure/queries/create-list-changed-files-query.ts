import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type ListChangedFilesInput,
	type ListChangedFilesOutput
} from '$infrastructure/bindings';
import {
	createTauriQuery,
	resolveInput,
	type InputResolver
} from '$infrastructure/create-tauri-query';

/**
 * Changed-files list for a diff target — a branch (`branchName`, diffed
 * against its merge-base with HEAD) or a commit (`commitSha`, diffed against
 * its first parent). Exactly one of the two must be set; the query stays
 * disabled until it is.
 */
export function createListChangedFilesQuery(
	input: InputResolver<'listChangedFiles'>,
	options?: Omit<CreateQueryOptions<ListChangedFilesOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	const hasTarget = (resolved: ListChangedFilesInput | undefined) =>
		!!resolved?.path && (!!resolved.branchName || !!resolved.commitSha);

	return createTauriQuery('listChangedFiles', {
		input,
		enabled: () => hasTarget(resolveInput<'listChangedFiles'>(input)),
		...options
	});
}

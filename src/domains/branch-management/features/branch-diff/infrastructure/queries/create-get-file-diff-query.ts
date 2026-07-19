import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type GetFileDiffInput,
	type GetFileDiffOutput
} from '$infrastructure/bindings';
import {
	createTauriQuery,
	resolveInput,
	type InputResolver
} from '$infrastructure/create-tauri-query';

/**
 * Full textual diff (hunks + lines) of one changed file. `oldPath` must be
 * passed through from the changed-files list for renames so the backend's
 * rename detection can pair both sides. Disabled until the target and file
 * are known.
 */
export function createGetFileDiffQuery(
	input: InputResolver<'getFileDiff'>,
	options?: Omit<CreateQueryOptions<GetFileDiffOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	const isComplete = (resolved: GetFileDiffInput | undefined) =>
		!!resolved?.path && !!resolved.filePath && (!!resolved.branchName || !!resolved.commitSha);

	return createTauriQuery('getFileDiff', {
		input,
		enabled: () => isComplete(resolveInput<'getFileDiff'>(input)),
		...options
	});
}

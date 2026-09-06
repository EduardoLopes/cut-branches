import { type CreateQueryOptions, type QueryClient } from '@tanstack/svelte-query';
import {
	type AppError,
	type GetFileDiffInput,
	type GetFileDiffOutput
} from '$infrastructure/bindings';
import {
	createTauriQuery,
	prefetchTauriQuery,
	resolveInput,
	type InputResolver
} from '$infrastructure/create-tauri-query';

/** Shared by the query and the prefetch below: both are pointless without a
 *  target and a file, and the prefetch must never key differently. */
const isComplete = (resolved: GetFileDiffInput | undefined) =>
	!!resolved?.path && !!resolved.filePath && (!!resolved.branchName || !!resolved.commitSha);

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
	return createTauriQuery('getFileDiff', {
		input,
		enabled: () => isComplete(resolveInput<'getFileDiff'>(input)),
		...options
	});
}

/**
 * Warms one file's diff. The panel that observes this query mounts only when
 * its row expands, so without this every row click opens on a spinner.
 */
export function prefetchFileDiff(queryClient: QueryClient, input: GetFileDiffInput) {
	if (!isComplete(input)) return;
	return prefetchTauriQuery(queryClient, 'getFileDiff', { input });
}

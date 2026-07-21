import { type CreateQueryOptions } from '@tanstack/svelte-query';
import {
	type AppError,
	type GetDiffStructureInput,
	type GetDiffStructureOutput
} from '$infrastructure/bindings';
import {
	createTauriQuery,
	resolveInput,
	type InputResolver
} from '$infrastructure/create-tauri-query';

/**
 * Code-structure analysis of a diff target: the symbols each changed file's
 * hunks touch and the import edges between changed files. Same target
 * contract as the changed-files query — exactly one of `branchName` /
 * `commitSha`; disabled until it is set. The whole view shares ONE instance
 * of this query (rows and canvas both read from it).
 */
export function createGetDiffStructureQuery(
	input: InputResolver<'getDiffStructure'>,
	options?: Omit<CreateQueryOptions<GetDiffStructureOutput, AppError>, 'queryKey' | 'queryFn'>
) {
	const hasTarget = (resolved: GetDiffStructureInput | undefined) =>
		!!resolved?.path && (!!resolved.branchName || !!resolved.commitSha);

	return createTauriQuery('getDiffStructure', {
		input,
		enabled: () => hasTarget(resolveInput<'getDiffStructure'>(input)),
		...options
	});
}

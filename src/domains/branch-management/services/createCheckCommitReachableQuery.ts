import type { IsCommitReachableInput } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

type CommitReachableQueryOptions = TauriQueryOptions<'isCommitReachable', [string, string, string]>;

export function createCheckCommitReachableQuery(
	input: IsCommitReachableInput,
	options?: CommitReachableQueryOptions
) {
	return createTauriQuery('isCommitReachable', {
		queryKey: ['commit', 'is_reachable', input.commitSha],
		input: () => input,
		...options
	});
}

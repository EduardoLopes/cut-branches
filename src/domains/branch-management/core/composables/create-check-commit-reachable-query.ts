import type { GetCommitReachabilityInput } from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

type CommitReachableQueryOptions = TauriQueryOptions<
	'getCommitReachability',
	[string, string, string]
>;

export function createCheckCommitReachableQuery(
	input: GetCommitReachabilityInput,
	options?: CommitReachableQueryOptions
) {
	return createTauriQuery('getCommitReachability', {
		queryKey: ['commit', 'is_reachable', input.commitSha],
		input: () => input,
		...options
	});
}

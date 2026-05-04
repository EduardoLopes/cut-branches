import type { GetRepositoryInput } from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetRepositoryQuery(
	input: () => GetRepositoryInput,
	options?: TauriQueryOptions<'getRepository'>
) {
	return createTauriQuery('getRepository', {
		input: () => input(),
		enabled: !!input().id,
		...options
	});
}

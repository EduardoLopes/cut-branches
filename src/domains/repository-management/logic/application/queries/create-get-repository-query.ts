import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetRepositoryQuery(
	path: () => string | undefined,
	options?: TauriQueryOptions<'getRepository'>
) {
	return createTauriQuery('getRepository', {
		input: () => ({ path: path() ?? '' }),
		enabled: !!path(),
		...options
	});
}

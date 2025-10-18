import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetRepositoryQuery(
	id: () => string | undefined,
	options?: TauriQueryOptions<'getRepository'>
) {
	return createTauriQuery('getRepository', {
		input: () => ({ id: id() ?? '' }),
		enabled: !!id(),
		...options
	});
}

import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

export function createGetRepositoryListQuery(options?: TauriQueryOptions<'getRepositoryList'>) {
	return createTauriQuery('getRepositoryList', {
		...options
	});
}

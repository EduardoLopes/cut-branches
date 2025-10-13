import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createGetRepositoryListQuery(options?: TauriQueryOptions<'getRepositoryList'>) {
	return createTauriQuery('getRepositoryList', {
		...options
	});
}

import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createListRepositoriesQuery(options?: TauriQueryOptions<'listRepositories'>) {
	return createTauriQuery('listRepositories', {
		queryKey: ['listRepositories'],
		...options
	});
}

import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

export function createListRepositoriesQuery(
	options?: Omit<TauriQueryOptions<'listRepositories'>, 'queryKey'>
) {
	return createTauriQuery('listRepositories', {
		queryKey: ['listRepositories'],
		...options
	});
}

import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

export function createGetRepositoryListQuery(options?: TauriQueryOptions<'getRepositoryList'>) {
	return createTauriQuery('getRepositoryList', {
		...options,
		// The list drives onboarding and the sidebar; a silent failure leaves the
		// user on a blank screen with no explanation.
		meta: { showErrorNotification: true, ...options?.meta }
	});
}

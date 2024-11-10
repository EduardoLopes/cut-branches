import { Store } from '../utils/store.svelte';

export function getSearchBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return Store.getInstance<string | undefined>('search', repository);
}

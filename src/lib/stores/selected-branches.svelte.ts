import { SetStore } from '../utils/set-store.svelte';

export function getSelectedBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return SetStore.getInstance<string>('selected', repository);
}

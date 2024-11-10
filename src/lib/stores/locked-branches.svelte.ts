import { SetStore } from '../utils/set-store.svelte';

export function getLockedBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return SetStore.getInstance<string>('locked', repository);
}

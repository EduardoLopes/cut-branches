import { z } from 'zod/v4';
import { SetStore } from '$lib/set-store.svelte';

// Schema for branch names (strings)
const branchNameSchema = z.string();

export function getLockedBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return SetStore.getInstance<string>(['locked', repository], branchNameSchema, []);
}

import { z } from 'zod';
import { SetStore } from '../utils/set-store.svelte';

// Schema for branch names (strings)
const branchNameSchema = z.string();

export function getLockedBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return SetStore.getInstance<string>(['locked', repository], branchNameSchema, []);
}

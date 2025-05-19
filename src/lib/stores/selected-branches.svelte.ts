import { z } from 'zod/v4';
import { SetStore } from '../utils/set-store.svelte';

// Schema for branch names (strings)
const branchNameSchema = z.string();

export function getSelectedBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return SetStore.getInstance<string>(['selected', repository], branchNameSchema, []);
}

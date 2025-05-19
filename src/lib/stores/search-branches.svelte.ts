import { z } from 'zod/v4';
import { Store } from '../utils/store.svelte';

// Schema for search terms (string or undefined)
const searchSchema = z.string().optional();

export function getSearchBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return Store.getInstance<string | undefined>(['search', repository], searchSchema, undefined);
}

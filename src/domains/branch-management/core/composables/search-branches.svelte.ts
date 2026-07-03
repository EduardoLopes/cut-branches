import { z } from 'zod/v4';
import { Store } from '$lib/store.svelte';

const searchSchema = z.string().optional();

const SEARCH_KEY_PREFIX = 'store_search_';
const KEY_VARIANTS = ['-active', '-deleted'] as const;

export function getSearchBranchesStore(repository?: string) {
	if (!repository) {
		return;
	}

	return Store.getInstance<string | undefined>(['search', repository], searchSchema, undefined);
}

export interface KnownRepoToken {
	id: string;
	name: string;
}

export function pruneOrphanedSearchKeys(knownRepos: readonly KnownRepoToken[]): void {
	if (typeof localStorage === 'undefined') return;

	const isAlive = (token: string) =>
		knownRepos.some((repo) => repo.id === token || repo.name === token);

	const keysToRemove: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith(SEARCH_KEY_PREFIX)) continue;

		const suffix = key.slice(SEARCH_KEY_PREFIX.length);
		const variant = KEY_VARIANTS.find((v) => suffix.endsWith(v));
		if (!variant) continue;

		const token = suffix.slice(0, -variant.length);
		if (!isAlive(token)) {
			keysToRemove.push(key);
		}
	}

	for (const key of keysToRemove) {
		localStorage.removeItem(key);
	}
}

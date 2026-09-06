import { z } from 'zod/v4';
import { Store } from '$lib/store.svelte';

/**
 * Per-repository list of cleanable paths the user has chosen to KEEP (exclude
 * from cleaning). Cleanup is opt-out: every discovered path is cleaned by
 * default, and a path only survives if it appears here. Keyed by repository id.
 */
const keeplistSchema = z.record(z.string(), z.array(z.string()));

export type Keeplist = z.infer<typeof keeplistSchema>;

function getKeeplistStore() {
	return Store.getInstance<Keeplist>(['cleanup-keeplist'], keeplistSchema, {});
}

/**
 * The paths kept (excluded) for a repository. Reactive: reading this inside a
 * component or `$derived` re-runs when the keep-list changes.
 */
export function getKeptPaths(repoId: string): string[] {
	return getKeeplistStore().get()?.[repoId] ?? [];
}

/** Whether a specific path is kept (will NOT be cleaned). */
export function isKept(repoId: string, path: string): boolean {
	return getKeptPaths(repoId).includes(path);
}

/**
 * Replace the kept paths for a repository. Uses `set` (not the store's
 * deep-merge `update`) so arrays are swapped wholesale; empty entries are
 * pruned to keep the record tidy.
 */
function setRepoKept(repoId: string, paths: string[]) {
	const current = getKeeplistStore().get() ?? {};
	const next: Keeplist = { ...current };
	if (paths.length === 0) {
		delete next[repoId];
	} else {
		next[repoId] = paths;
	}
	getKeeplistStore().set(next);
}

/** Toggle whether a single path is kept. */
export function toggleKept(repoId: string, path: string) {
	const kept = getKeptPaths(repoId);
	setRepoKept(repoId, kept.includes(path) ? kept.filter((p) => p !== path) : [...kept, path]);
}

/** Keep every given path (deselect the whole repo for cleaning). */
export function keepAll(repoId: string, paths: string[]) {
	setRepoKept(repoId, [...paths]);
}

/** Clear all kept paths for a repo (select the whole repo for cleaning). */
export function keepNone(repoId: string) {
	setRepoKept(repoId, []);
}

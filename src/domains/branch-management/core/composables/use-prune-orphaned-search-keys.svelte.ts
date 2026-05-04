import { createGetRepositoryListQuery } from './create-get-repository-list-query';
import { pruneOrphanedSearchKeys } from '$domains/branch-management/store/search-branches.svelte';

let alreadyPrunedThisSession = false;

export function resetPruneSessionGuardForTests(): void {
	alreadyPrunedThisSession = false;
}

export function usePruneOrphanedSearchKeys(): void {
	const repoListQuery = createGetRepositoryListQuery();

	$effect(() => {
		if (alreadyPrunedThisSession) return;
		const repos = repoListQuery.data;
		if (!repos) return;
		pruneOrphanedSearchKeys(repos.map((r) => ({ id: r.id, name: r.name })));
		alreadyPrunedThisSession = true;
	});
}

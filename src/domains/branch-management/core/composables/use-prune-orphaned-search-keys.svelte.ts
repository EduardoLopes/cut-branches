import { pruneOrphanedSearchKeys } from '$domains/branch-management/core/composables/search-branches.svelte';
import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';

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

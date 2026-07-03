/**
 * Deleted Branches View Composable
 *
 * Provides stateful logic specific to the deleted branches view.
 * Manages repository data, branches query, and search filtering
 * for deleted branches.
 */

import { getSearchBranchesStore } from '$domains/branch-management/core/composables/search-branches.svelte';
import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
import { createGetRepositoryQuery } from '$domains/branch-management/infrastructure/queries/create-get-repository-query';
import { buildRepositoryData } from '$domains/branch-management/utils/build-repository-data';
import { filterBranchesBySearch } from '$domains/branch-management/utils/filter-branches-by-search';

interface UseDeletedBranchesViewProps {
	getId: () => string;
}

export function useDeletedBranchesView({ getId }: UseDeletedBranchesViewProps) {
	const repositoryQuery = createGetRepositoryQuery(() => getId(), {
		enabled: () => !!getId()
	});

	const search = $derived(getSearchBranchesStore(`${getId()}-deleted`));

	// Query for deleted branches
	const branchesQuery = createGetBranchesQuery(
		() => ({
			repoId: getId() ?? '',
			filters: {
				deletionStatus: 'deleted'
			}
		}),
		{
			enabled: () => !!getId()
		}
	);

	// Filter branches by search term
	const branches = $derived.by(() => {
		const data = branchesQuery?.data;

		if (!data?.branches) {
			return [];
		}

		return filterBranchesBySearch(data.branches, search?.state);
	});

	const searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	// Build repository data object from query
	const currentRepoData = $derived.by(() => {
		return buildRepositoryData(repositoryQuery.data, branchesQuery?.data);
	});

	// Extract query states
	const isLoading = $derived(branchesQuery?.isLoading ?? false);
	const isError = $derived(branchesQuery?.isError ?? false);
	const error = $derived(branchesQuery?.error ?? null);

	return {
		get repository() {
			return repositoryQuery.data;
		},
		get path() {
			return repositoryQuery.data?.path;
		},
		get search() {
			return search;
		},
		get branches() {
			return branches;
		},
		get searchNoResultsFound() {
			return searchNoResultsFound;
		},
		get currentRepoData() {
			return currentRepoData;
		},
		get isLoading() {
			return isLoading;
		},
		get isError() {
			return isError;
		},
		get error() {
			return error;
		}
	};
}

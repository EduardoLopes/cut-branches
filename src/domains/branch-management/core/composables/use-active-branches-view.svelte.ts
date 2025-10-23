/**
 * Active Branches View Composable
 *
 * Provides stateful logic specific to the active branches view.
 * Manages repository data, branches query, search filtering, and
 * active branch-specific derived states like selectable count.
 */

import { onDestroy } from 'svelte';
import { SvelteDate } from 'svelte/reactivity';
import { createGetBranchesQuery } from './create-get-branches-query';
import { createGetRepositoryQuery } from './create-get-repository-query';
import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
import { buildRepositoryData } from '$domains/branch-management/utils/build-repository-data';
import { filterBranchesBySearch } from '$domains/branch-management/utils/filter-branches-by-search';
import { globalStore } from '$store/global-store.svelte';
import { isEmptyString } from '$utils/string-utils';

interface UseActiveBranchesViewProps {
	getId: () => string;
}

export function useActiveBranchesView({ getId }: UseActiveBranchesViewProps) {
	const repositoryQuery = createGetRepositoryQuery(() => getId(), {
		enabled: () => !!getId()
	});

	const search = $derived(getSearchBranchesStore(`${getId()}-active`));

	// Query for active branches
	const branchesQuery = createGetBranchesQuery(
		() => ({
			repoId: getId() ?? '',
			filters: {
				deletionStatus: 'active',
				includeCurrent: true
			}
		}),
		{
			enabled: () => !!getId()
		}
	);

	// Update global store with last updated timestamp
	$effect(() => {
		if (repositoryQuery.data?.path && branchesQuery) {
			globalStore.lastUpdatedAt = new SvelteDate(branchesQuery.dataUpdatedAt);
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		globalStore.lastUpdatedAt = undefined;
	});

	// Filter branches by search term
	const branches = $derived.by(() => {
		const data = branchesQuery?.data;

		if (!data?.branches) {
			return [];
		}

		return filterBranchesBySearch(data.branches, search?.state);
	});

	// Calculate the number of branches that can be selected (excludes current branch and locked branches)
	const selectibleCount = $derived.by(() => {
		if (!branches) {
			return 0;
		}

		const currentBranch = repositoryQuery.data?.currentBranch;
		return branches.filter((item) => item.name !== currentBranch && !item.isLocked).length;
	});

	const searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	const hasNoBranchesToDelete = $derived(selectibleCount === 0 && isEmptyString(search?.state));

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
		get selectibleCount() {
			return selectibleCount;
		},
		get searchNoResultsFound() {
			return searchNoResultsFound;
		},
		get hasNoBranchesToDelete() {
			return hasNoBranchesToDelete;
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

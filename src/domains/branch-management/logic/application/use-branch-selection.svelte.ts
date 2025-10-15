/**
 * Branch Selection Composable
 *
 * Provides stateful logic for branch selection functionality.
 * Manages selection state, locked branches, and selection operations.
 */

import { createGetBranchesQuery } from './queries/create-get-branches-query';
import {
	createAddSelectedBranchesMutation,
	createClearSelectedBranchesMutation
} from '$domains/branch-management/services/createSelectedBranchesMutations';
import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
import { calculateSelectionState } from '$domains/branch-management/utils/calculate-selection-state';
import { filterSelectableBranches } from '$domains/branch-management/utils/filter-selectable-branches';
import {
	formatSearchInfoText,
	formatCountInfoText
} from '$domains/branch-management/utils/format-branch-selection-text';
import type { Repository } from '$services/common';

interface UseBranchSelectionProps {
	repository: () => Repository | undefined;
}

export function useBranchSelection({ repository }: UseBranchSelectionProps) {
	const search = $derived(getSearchBranchesStore(repository()?.name));

	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repository()?.id ?? '',
		filters: { deletionStatus: 'active' as const }
	}));
	const selectedBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repository()?.id ?? '',
		filters: { selectionStatus: 'selected' as const }
	}));
	const addSelectedMutation = createAddSelectedBranchesMutation();
	const clearSelectedMutation = createClearSelectedBranchesMutation();

	// Filter branches based on locked/current and search state
	const branches = $derived.by(() => {
		const allBranches = branchesQuery.data?.branches ?? [];
		const currentBranch = repository()?.currentBranch;
		const searchQuery = search?.state ?? '';

		return filterSelectableBranches({
			branches: allBranches,
			currentBranch,
			searchQuery
		});
	});

	const selectibleCount = $derived(branches.length);
	const selectedCount = $derived(selectedBranchesQuery.data?.branches.length ?? 0);

	const selectionState = $derived(
		calculateSelectionState({
			selectedCount,
			selectibleCount
		})
	);

	const isIndeterminate = $derived(selectionState.isIndeterminate);
	const isAllSelected = $derived(selectionState.isAllSelected);
	const hasSearchQuery = $derived((search?.state?.length ?? 0) > 0);

	// Computed text for search info display
	const searchInfoText = $derived.by(() => {
		if (!hasSearchQuery) return;

		return formatSearchInfoText({
			selectedCount,
			selectibleCount,
			searchQuery: search?.state ?? ''
		});
	});

	// Computed text for count info display
	const countInfoText = $derived(
		formatCountInfoText({
			selectedCount,
			selectibleCount
		})
	);

	async function handleSelectAll() {
		const repo = repository();
		if (!repo?.id) return;

		// If indeterminate or all are selected, deselect all
		if (isIndeterminate || isAllSelected) {
			await clearSelectedMutation.mutateAsync({ repoId: repo.id });
		} else {
			// If none are selected, select all
			const branchesToAdd = branches.map((branch) => branch.name);

			// Use mutateAsync to properly chain operations
			await clearSelectedMutation.mutateAsync({
				repoId: repo.id
			});
			await addSelectedMutation.mutateAsync({
				repoId: repo.id,
				branchNames: branchesToAdd
			});
		}
	}

	return {
		get search() {
			return search;
		},
		get selectedBranchesQuery() {
			return selectedBranchesQuery;
		},
		get branchLabel() {
			return {
				singular: 'branch',
				plural: 'branches'
			};
		},
		get selectibleCount() {
			return selectibleCount;
		},
		get selectedCount() {
			return selectedCount;
		},
		get isIndeterminate() {
			return isIndeterminate;
		},
		get isAllSelected() {
			return isAllSelected;
		},
		get hasSearchQuery() {
			return hasSearchQuery;
		},
		get searchInfoText() {
			return searchInfoText;
		},
		get countInfoText() {
			return countInfoText;
		},
		get handleSelectAll() {
			return handleSelectAll;
		}
	};
}

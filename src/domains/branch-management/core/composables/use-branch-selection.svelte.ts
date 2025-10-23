/**
 * Branch Selection Composable
 *
 * Provides stateful logic for branch selection functionality.
 * Manages selection state, locked branches, and selection operations.
 */

import { createGetBranchesQuery } from './create-get-branches-query';
import { createSetBranchSelectionAllMutation } from './create-selected-branches-mutations';
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
	branchContext: () => 'active' | 'deleted';
}

export function useBranchSelection({ repository, branchContext }: UseBranchSelectionProps) {
	const search = $derived(getSearchBranchesStore(`${repository()?.name}-${branchContext()}`));

	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repository()?.id ?? '',
		filters: { deletionStatus: branchContext() }
	}));
	const selectedBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repository()?.id ?? '',
		filters: { selectionStatus: 'selected' as const, deletionStatus: branchContext() }
	}));

	// Unified mutations for selected branches
	const setSelectionAllMutation = createSetBranchSelectionAllMutation();

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

		// If indeterminate or all are selected, deselect all (including locked and current)
		if (isIndeterminate || isAllSelected) {
			await setSelectionAllMutation.mutateAsync({
				repoId: repo.id,
				isSelected: false,
				deletionStatus: branchContext(),
				excludeLocked: false,
				excludeCurrent: false
			});
		} else {
			// Select all selectable branches (defaults: excludeLocked=true, excludeCurrent=true)
			await setSelectionAllMutation.mutateAsync({
				repoId: repo.id,
				isSelected: true,
				deletionStatus: branchContext()
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

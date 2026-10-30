/**
 * Branch Selection Composable
 *
 * Provides stateful logic for branch selection functionality.
 * Manages selection state, locked branches, and selection operations.
 */

import { getSearchBranchesStore } from '$domains/branch-management/core/composables/search-branches.svelte';
import { createSetBranchSelectionAllMutation } from '$domains/branch-management/infrastructure/mutations/create-set-branch-selection-all-mutation';
import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
import { filterSelectableBranches } from '$domains/branch-management/utils/filter-selectable-branches';
import {
	formatSearchInfoText,
	formatCountInfoText
} from '$domains/branch-management/utils/format-branch-selection-text';
import type { Repository } from '$types/repository';

interface UseBranchSelectionProps {
	repository: () => Repository | undefined;
	branchContext: () => 'active' | 'deleted';
}

export function useBranchSelection({ repository, branchContext }: UseBranchSelectionProps) {
	const search = $derived(getSearchBranchesStore(`${repository()?.name}-${branchContext()}`));

	// `includeCurrent: true` is the backend default, so this returns exactly what
	// omitting it returned — but the query key embeds the input verbatim, and the
	// views (and the sidebar prefetch) all spell it out. Matching them makes this
	// the *same* cached query instead of a second identical IPC round-trip and a
	// second full conversion of the branch list. The current branch is filtered
	// out below by `filterSelectableBranches` either way.
	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repository()?.id ?? '',
		filters: { deletionStatus: branchContext(), includeCurrent: true }
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

	// Counted against `branches`, not against the raw selected-branches query:
	// that query is repository-wide, while `selectibleCount` has already dropped
	// the current branch, locked branches and anything the search filtered out.
	// Comparing the two directly made the pair incoherent whenever a search was
	// active — "5 branches are selected / 2 branches were found" — and the bulk
	// bar's "Select all N" would offer to select fewer than were selected. Both
	// numbers now describe the same set.
	const selectedCount = $derived.by(() => {
		// Built fresh inside the derivation and never mutated afterwards — the
		// reactivity comes from the derivation re-running, not from the Set.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const selectedNames = new Set(
			(selectedBranchesQuery.data?.branches ?? []).map((branch) => branch.getName())
		);
		return branches.filter((branch) => selectedNames.has(branch.getName())).length;
	});

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

	/** Deselects every branch in the context, locked and current included. */
	async function clearSelection() {
		const repo = repository();
		if (!repo?.id) return;

		await setSelectionAllMutation.mutateAsync({
			repoId: repo.id,
			isSelected: false,
			deletionStatus: branchContext(),
			excludeLocked: false,
			excludeCurrent: false
		});
	}

	/** Selects every selectable branch (defaults: excludeLocked=true, excludeCurrent=true). */
	async function selectAll() {
		const repo = repository();
		if (!repo?.id) return;

		await setSelectionAllMutation.mutateAsync({
			repoId: repo.id,
			isSelected: true,
			deletionStatus: branchContext()
		});
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
		get hasSearchQuery() {
			return hasSearchQuery;
		},
		get searchInfoText() {
			return searchInfoText;
		},
		get countInfoText() {
			return countInfoText;
		},
		get clearSelection() {
			return clearSelection;
		},
		get selectAll() {
			return selectAll;
		}
	};
}

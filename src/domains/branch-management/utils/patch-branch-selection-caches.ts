/**
 * Surgical cache updates for branch selection.
 *
 * Toggling a checkbox used to invalidate the whole `branch` resource, which
 * made every mounted `getBranchList` observer (active list, deleted list,
 * selection counts, selected-only views…) refetch the full branch payload —
 * on repositories with many branches that's several large IPC round-trips and
 * a full list re-conversion per click, which is what froze the UI.
 *
 * Selection is fully client-predictable: the mutation's own input says exactly
 * which branches flip to which state. So instead of refetching, this patches
 * every cached `getBranchList` entry for the repository in place, preserving
 * the identity of untouched branch objects (so structural sharing +
 * memoized converters keep untouched rows from re-rendering).
 *
 * Any cache whose filters this function can't confidently reproduce is
 * invalidated individually instead — correctness first, surgery when safe.
 */
import type { QueryClient } from '@tanstack/svelte-query';
import type {
	Branch as BranchData,
	BranchFilters,
	GetBranchListInput,
	GetBranchListOutput
} from '$infrastructure/bindings';

export type SelectionUpdate =
	| { type: 'batch'; branchNames: readonly string[]; isSelected: boolean }
	| {
			type: 'all';
			isSelected: boolean;
			deletionStatus: 'active' | 'deleted' | 'all';
			excludeLocked: boolean;
			excludeCurrent: boolean;
	  };

function isBranchListKey(
	queryKey: readonly unknown[]
): queryKey is readonly [string, string, GetBranchListInput] {
	return (
		queryKey[1] === 'getBranchList' &&
		typeof queryKey[2] === 'object' &&
		queryKey[2] !== null &&
		'repoId' in queryKey[2]
	);
}

/** Whether the mutation touches this branch at all. */
function isAffected(branch: BranchData, update: SelectionUpdate): boolean {
	if (update.type === 'batch') {
		return update.branchNames.includes(branch.name);
	}
	// `set all` is scoped by deletion status on the Rust side.
	const isDeleted = branch.deletedAt != null;
	if (update.deletionStatus === 'active' && isDeleted) return false;
	if (update.deletionStatus === 'deleted' && !isDeleted) return false;
	// The Rust update applies the exclusion flags in both directions.
	if (update.excludeLocked && branch.isLocked) return false;
	if (update.excludeCurrent && branch.current) return false;
	return true;
}

/** The branch's selection state after the mutation. */
function nextSelected(branch: BranchData, update: SelectionUpdate): boolean {
	return isAffected(branch, update) ? update.isSelected : branch.isSelected;
}

/** Re-evaluates a cached list's own selection filter against the new state.
 *  Returns null when the filter is one this patcher doesn't model. */
function passesSelectionFilter(
	filters: BranchFilters | undefined,
	selected: boolean
): boolean | null {
	const filter = filters?.selectionStatus ?? 'all';
	if (filter === 'all') return true;
	if (filter === 'selected') return selected;
	if (filter === 'unselected') return !selected;
	return null;
}

/**
 * Patches every cached `getBranchList` for `repoId` to reflect a selection
 * mutation, falling back to a per-query invalidation when a cache's filters
 * can't be safely reproduced client-side (e.g. a selection-filtered cache
 * that would need to *gain* rows this patcher has no source data for).
 */
export function patchBranchSelectionCaches(
	queryClient: QueryClient,
	repoId: string,
	update: SelectionUpdate
): void {
	const entries = queryClient.getQueriesData<GetBranchListOutput>({
		predicate: (query) => isBranchListKey(query.queryKey)
	});

	// Selection-agnostic caches keyed by their remaining filters, used as the
	// row source when a 'selected'/'unselected'-filtered cache needs to gain
	// entries. A source is only valid when every non-selection filter matches.
	const sourceKeyFor = (filters: BranchFilters | undefined) =>
		JSON.stringify({
			deletionStatus: filters?.deletionStatus ?? 'active',
			mergeStatus: filters?.mergeStatus ?? 'all',
			lockStatus: filters?.lockStatus ?? 'all',
			includeCurrent: filters?.includeCurrent ?? true
		});
	const sources = new Map<string, BranchData[]>();
	for (const [queryKey, data] of entries) {
		if (!data || !isBranchListKey(queryKey)) continue;
		const input = queryKey[2];
		if (input.repoId !== repoId) continue;
		if ((input.filters?.selectionStatus ?? 'all') === 'all') {
			sources.set(sourceKeyFor(input.filters), data.branches);
		}
	}

	for (const [queryKey, data] of entries) {
		if (!data || !isBranchListKey(queryKey)) continue;
		const input = queryKey[2];
		if (input.repoId !== repoId) continue;

		const filters = input.filters;
		const selectionFilter = filters?.selectionStatus ?? 'all';

		if (selectionFilter === 'all') {
			// Membership can't change — flip `isSelected` in place, keeping the
			// identity of untouched entries.
			let changed = false;
			const branches = data.branches.map((branch) => {
				const selected = nextSelected(branch, update);
				if (selected === branch.isSelected) return branch;
				changed = true;
				return { ...branch, isSelected: selected };
			});
			if (changed) {
				queryClient.setQueryData<GetBranchListOutput>(queryKey, { ...data, branches });
			}
			continue;
		}

		// Selection-filtered cache: membership changes. Rebuild it from the
		// matching unfiltered source when one is cached; otherwise refetch it.
		const source = sources.get(sourceKeyFor(filters));
		if (!source) {
			void queryClient.invalidateQueries({ queryKey });
			continue;
		}

		const rebuilt: BranchData[] = [];
		let unknownFilter = false;
		for (const branch of source) {
			const selected = nextSelected(branch, update);
			const passes = passesSelectionFilter(filters, selected);
			if (passes === null) {
				unknownFilter = true;
				break;
			}
			if (!passes) continue;
			// Preserve identity where the entry already exists unchanged in the
			// filtered cache (same raw object also means same converted Branch).
			const existing = data.branches.find((b) => b.name === branch.name);
			if (existing && existing.isSelected === selected) {
				rebuilt.push(existing);
			} else {
				rebuilt.push(selected === branch.isSelected ? branch : { ...branch, isSelected: selected });
			}
		}
		if (unknownFilter) {
			void queryClient.invalidateQueries({ queryKey });
			continue;
		}
		queryClient.setQueryData<GetBranchListOutput>(queryKey, { ...data, branches: rebuilt });
	}
}

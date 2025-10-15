/**
 * Selection state calculation utilities
 */

export interface SelectionStateParams {
	selectedCount: number;
	selectibleCount: number;
}

export interface SelectionState {
	isIndeterminate: boolean;
	isAllSelected: boolean;
}

/**
 * Calculates the selection state based on counts
 */
export function calculateSelectionState({
	selectedCount,
	selectibleCount
}: SelectionStateParams): SelectionState {
	const isAllSelected = selectedCount === selectibleCount && selectibleCount > 0;
	const isIndeterminate = selectedCount > 0 && selectedCount < selectibleCount;

	return {
		isIndeterminate,
		isAllSelected
	};
}

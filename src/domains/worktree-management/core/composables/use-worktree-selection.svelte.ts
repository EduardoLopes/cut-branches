import { SvelteSet } from 'svelte/reactivity';
import { type Worktree } from '../models/worktree';

interface UseWorktreeSelectionProps {
	/** Reactive getter for the current worktree list. */
	getWorktrees: () => Worktree[];
}

/**
 * Selection state for bulk worktree actions, mirroring branch selection. Only
 * linked (non-main), unlocked worktrees are selectable — the main worktree can't
 * be removed, and locked worktrees are protected until unlocked (same rule as
 * locked branches). The set is pruned to currently-selectable names so a stale
 * selection never lingers after the list changes.
 */
export function useWorktreeSelection({ getWorktrees }: UseWorktreeSelectionProps) {
	// SvelteSet is reactive on mutation, so it is mutated in place.
	const selected = new SvelteSet<string>();

	const selectableNames = $derived(
		getWorktrees()
			.filter((w) => !w.isMain() && !w.isLocked())
			.map((w) => w.getName())
	);
	const selectedNames = $derived(selectableNames.filter((name) => selected.has(name)));
	const selectedCount = $derived(selectedNames.length);
	const selectableCount = $derived(selectableNames.length);
	const allSelected = $derived(selectableCount > 0 && selectedCount === selectableCount);
	const someSelected = $derived(selectedCount > 0 && selectedCount < selectableCount);

	function toggle(name: string) {
		if (selected.has(name)) {
			selected.delete(name);
		} else {
			selected.add(name);
		}
	}

	function setAll(checked: boolean) {
		selected.clear();
		if (checked) {
			for (const name of selectableNames) selected.add(name);
		}
	}

	function clear() {
		selected.clear();
	}

	return {
		get selectedNames() {
			return selectedNames;
		},
		get selectedCount() {
			return selectedCount;
		},
		get selectableCount() {
			return selectableCount;
		},
		get allSelected() {
			return allSelected;
		},
		get someSelected() {
			return someSelected;
		},
		isSelected(name: string) {
			return selected.has(name);
		},
		toggle,
		setAll,
		clear
	};
}

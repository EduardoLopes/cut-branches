import type { DiscoveredItem } from '../core/composables/use-discover-repositories.svelte';

/** A scan result with the linked worktrees that belong to it nested beneath. */
export interface DiscoveredGroup {
	item: DiscoveredItem;
	worktrees: DiscoveredItem[];
}

/** Trailing separators would keep `/repo/` from matching `/repo`. */
function normalizePath(path: string): string {
	return path.replace(/[/\\]+$/, '');
}

/**
 * Nests each linked worktree under the repository it belongs to. A worktree
 * whose main repository is not in `items` (outside the scanned folder, or
 * hidden by a filter) stays at the top level as its own group.
 *
 * Groups with anything left to add come first, so an already-added repository
 * whose worktrees are still addable is not buried among the fully-added ones;
 * otherwise the incoming order is preserved, at the top level and within each
 * group.
 */
export function groupDiscoveredRepositories(items: DiscoveredItem[]): DiscoveredGroup[] {
	const byPath = new Map<string, DiscoveredGroup>();
	for (const item of items) {
		if (!item.isWorktree) {
			byPath.set(normalizePath(item.path), { item, worktrees: [] });
		}
	}

	const groups: DiscoveredGroup[] = [];
	for (const item of items) {
		if (!item.isWorktree) {
			groups.push(byPath.get(normalizePath(item.path)) as DiscoveredGroup);
			continue;
		}
		const parent = item.mainRepositoryPath
			? byPath.get(normalizePath(item.mainRepositoryPath))
			: undefined;
		if (parent) {
			parent.worktrees.push(item);
		} else {
			groups.push({ item, worktrees: [] });
		}
	}

	const hasAddable = (group: DiscoveredGroup) =>
		!group.item.alreadyAdded || group.worktrees.some((worktree) => !worktree.alreadyAdded);
	// `sort` is stable, so groups with the same addability keep their order.
	return groups.sort((a, b) => Number(hasAddable(b)) - Number(hasAddable(a)));
}

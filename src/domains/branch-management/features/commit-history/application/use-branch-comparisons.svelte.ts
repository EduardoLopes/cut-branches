/**
 * Branch Comparisons Composable
 *
 * Lazily fetches ahead/behind signals (vs the base branch) for the branch
 * names currently visible in the history gutter. Visibility updates are
 * debounced and diffed against what was already requested, so scrolling a
 * long gutter issues a few small batches instead of one eager call for every
 * local branch in the repository.
 */

import { useQueryClient } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { fetchBranchComparisonBatch } from '$domains/branch-management/features/commit-history/infrastructure/queries/create-list-branch-comparison-query';

export interface BranchSignals {
	sha: string;
	ahead: number;
	behind: number;
}

interface UseBranchComparisonsProps {
	getRepoId: () => string;
	getPath: () => string | undefined;
	getVisibleBranchNames: () => string[];
	/** Debounce for visibility changes (ms). */
	debounceMs?: number;
}

export function useBranchComparisons({
	getRepoId,
	getPath,
	getVisibleBranchNames,
	debounceMs = 150
}: UseBranchComparisonsProps) {
	const queryClient = useQueryClient();

	const comparisons = new SvelteMap<string, BranchSignals>();
	let baseName = $state<string | null>(null);
	// Names already fetched or inflight — read only inside the fetcher, but a
	// reactive set keeps the composable lint-consistent and future-proof.
	const requested = new SvelteSet<string>();
	let currentPath: string | undefined;

	const fetchMissing = async () => {
		const path = getPath();
		if (!path) return;

		const missing = getVisibleBranchNames().filter((name) => !requested.has(name));
		if (missing.length === 0) return;
		missing.forEach((name) => requested.add(name));

		try {
			const result = await fetchBranchComparisonBatch(queryClient, {
				repoId: getRepoId(),
				path,
				branchNames: missing
			});
			baseName = result.baseName;
			for (const branch of result.branches) {
				comparisons.set(branch.name, {
					sha: branch.sha,
					ahead: branch.ahead,
					behind: branch.behind
				});
			}
		} catch {
			// Roll back so a later visibility change retries these names.
			missing.forEach((name) => requested.delete(name));
		}
	};

	const debouncedFetch = debounce(fetchMissing, debounceMs);

	$effect(() => {
		const path = getPath();
		getVisibleBranchNames(); // tracked: new gutter rows trigger a batch

		if (path !== currentPath) {
			// Repository switch: everything known belongs to the old repo.
			currentPath = path;
			requested.clear();
			comparisons.clear();
			baseName = null;
		}
		debouncedFetch();

		// A pending timer must not outlive the view (or fire between reruns
		// with stale tracking); rescheduling above restores it.
		return () => debouncedFetch.cancel();
	});

	return {
		/** Signals for a branch, or undefined while not yet fetched. */
		get(name: string): BranchSignals | undefined {
			return comparisons.get(name);
		},
		get baseName() {
			return baseName;
		},
		/** Forget everything and refetch the currently visible names. */
		reset() {
			requested.clear();
			comparisons.clear();
			baseName = null;
			debouncedFetch();
		}
	};
}

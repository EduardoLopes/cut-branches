import { useQueryClient } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { prefetchTauriQuery } from '$utils/create-tauri-query';

/**
 * Creates a prefetch function for repository data (branches and repository details)
 * Uses debouncing to avoid excessive calls on quick mouse movements
 *
 * @returns A function that prefetches branch list and repository data for a given repository ID
 *
 * @example
 * const prefetchRepositoryData = createPrefetchRepositoryData();
 *
 * // On hover over repository menu item
 * const handleHover = (repoId: string) => {
 *   prefetchRepositoryData(repoId);
 * };
 */
export function createPrefetchRepositoryData() {
	const queryClient = useQueryClient();

	// Create a debounced function that prefetches both queries
	// Using 200ms debounce to avoid excessive prefetches on quick mouse movements
	const debouncedPrefetch = debounce((repoId: string) => {
		// Prefetch branches with active filter (most common use case)
		prefetchTauriQuery(queryClient, 'getBranchList', {
			input: {
				repoId,
				filters: {
					deletionStatus: 'active'
				}
			},
			staleTime: 5 * 60 * 1000 // 5 minutes - avoid re-prefetching fresh data
		});

		// Prefetch full repository details
		prefetchTauriQuery(queryClient, 'getRepository', {
			input: { id: repoId },
			staleTime: 5 * 60 * 1000 // 5 minutes
		});
	}, 200);

	/**
	 * Prefetches both branch list and repository data for the given repository ID
	 * @param repoId - The repository ID to prefetch data for
	 */
	return (repoId: string) => {
		debouncedPrefetch(repoId);
	};
}

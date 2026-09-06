import { createQuery, type QueryClient } from '@tanstack/svelte-query';
import type {
	ListStaleRepositoriesInput,
	ListStaleRepositoriesOutput
} from '$infrastructure/bindings';
import { getResource } from '$infrastructure/query-key-utils';
import { buildCommandExecutor } from '$infrastructure/tauri-commands';

/**
 * Server-state adapter (§1.2) for the bulk stale-repository scan. Modelled as a
 * cached query (not a mutation) so revisiting the cleanup page shows the last
 * result instantly and only re-scans in the background when the data is stale —
 * scanning the disk is expensive and doesn't need to block the UI every visit.
 */
const COMMAND = 'listStaleRepositories';
const execute = buildCommandExecutor(COMMAND);

/**
 * The cache key shared by the reactive page query and the startup prefetch, so
 * both hit a single entry (opening the page after startup is a cache hit).
 */
export function staleRepositoriesQueryKey(input: ListStaleRepositoriesInput) {
	return [getResource(COMMAND), COMMAND, input].filter((v) => v !== undefined && v !== null);
}

function staleRepositoriesQueryOptions(input: ListStaleRepositoriesInput) {
	return {
		queryKey: staleRepositoriesQueryKey(input),
		queryFn: () => execute(input),
		// Scanning is heavy; keep results fresh for a few minutes before a
		// background re-scan. Cached data is shown meanwhile (no loading state).
		staleTime: 5 * 60 * 1000
	};
}

/** Reactive page query. Reads `input` through a getter so it stays reactive. */
export function createListStaleRepositoriesQuery(getInput: () => ListStaleRepositoriesInput) {
	return createQuery(() => ({
		...staleRepositoriesQueryOptions(getInput()),
		meta: { showErrorNotification: true }
	}));
}

/**
 * Warms the same cache entry from a non-component context (startup) and returns
 * the scan result. Best-effort callers should catch — a background scan must
 * never surface an error toast.
 */
export function fetchStaleRepositories(
	queryClient: QueryClient,
	input: ListStaleRepositoriesInput
): Promise<ListStaleRepositoriesOutput> {
	return queryClient.fetchQuery(staleRepositoriesQueryOptions(input));
}

/**
 * Optimistically remove a just-cleaned folder from every cached stale-scan entry
 * (any threshold variant), recomputing sizes and dropping repositories left with
 * no targets. Driven by the backend `cleanup-target-cleaned` event so the list
 * reflects a deletion immediately, without waiting for a full re-scan.
 */
export function removeCleanedTargetFromCache(
	queryClient: QueryClient,
	cleaned: { repositoryId: string; path: string }
) {
	queryClient.setQueriesData<ListStaleRepositoriesOutput>(
		{ queryKey: [getResource(COMMAND), COMMAND] },
		(old) => {
			if (!old) return old;
			let changed = false;
			const repositories = old.repositories
				.map((repo) => {
					if (repo.id !== cleaned.repositoryId) return repo;
					const targets = repo.targets.filter((t) => t.path !== cleaned.path);
					if (targets.length === repo.targets.length) return repo;
					changed = true;
					return {
						...repo,
						targets,
						reclaimableBytes: targets.reduce((sum, t) => sum + t.sizeBytes, 0)
					};
				})
				.filter((repo) => repo.targets.length > 0);
			if (!changed) return old;
			return {
				repositories,
				totalReclaimableBytes: repositories.reduce((sum, r) => sum + r.reclaimableBytes, 0)
			};
		}
	);
}

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
